import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEVSMS_URL = 'https://devsms.uz/api/send_sms.php'

async function sendOne(token: string, phone: string, message: string, from: string): Promise<void> {
  const res = await fetch(DEVSMS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: phone.replace(/[^0-9]/g, ''),
      message,
      from,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DevSMS failed: ${res.status} — ${text}`)
  }

  const json = await res.json()
  if (!json?.success) {
    throw new Error(`DevSMS error: ${JSON.stringify(json)}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { date, template_id, test_phone, test_message, student_ids, group_id } = body

    const smsToken = Deno.env.get('DEVSMS_TOKEN')!
    const smsFrom  = Deno.env.get('DEVSMS_FROM') || '4546'

    if (!smsToken) throw new Error('DEVSMS_TOKEN environment variable not set')

    // ── Test SMS mode ────────────────────────────────────────────────────────
    if (test_phone && test_message) {
      await sendOne(smsToken, test_phone, test_message, smsFrom)
      return new Response(
        JSON.stringify({ success: true, sent: 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Bulk send mode ───────────────────────────────────────────────────────
    if (!date) throw new Error('date is required')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase    = createClient(supabaseUrl, serviceKey)

    // 1. Get template
    let templateBody = 'Hurmatli ota-ona, farzandingiz {ism} bugun ({sana}) darsga kelmadi.'
    if (template_id) {
      const { data: tpl } = await supabase
        .from('sms_templates')
        .select('body')
        .eq('id', template_id)
        .single()
      if (tpl?.body) templateBody = tpl.body
    }

    // 2. Get group name
    let groupName = ''
    if (group_id) {
      const { data: grp } = await supabase
        .from('groups')
        .select('name')
        .eq('id', group_id)
        .single()
      if (grp?.name) groupName = grp.name
    }

    // 3. Get absent students without SMS
    let absentsQuery = supabase
      .from('attendance')
      .select('id, student_id, students(full_name, parent_phone)')
      .eq('date', date)
      .eq('status', 'absent')
      .eq('sms_sent', false)

    if (student_ids && student_ids.length > 0) {
      absentsQuery = absentsQuery.in('student_id', student_ids)
    }

    const { data: absentList, error: fetchErr } = await absentsQuery
    if (fetchErr) throw fetchErr

    if (!absentList || absentList.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No pending SMS' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Get monthly absent counts for all students
    const currentMonth = date.slice(0, 7) // "2026-03"
    const monthStart = `${currentMonth}-01`
    const monthEnd = `${currentMonth}-31`
    const studentIdList = absentList.map((a: any) => a.student_id)

    const { data: monthlyAbsents } = await supabase
      .from('attendance')
      .select('student_id')
      .in('student_id', studentIdList)
      .eq('status', 'absent')
      .gte('date', monthStart)
      .lte('date', monthEnd)

    const monthlyCountMap: Record<string, number> = {}
    ;(monthlyAbsents || []).forEach((row: any) => {
      monthlyCountMap[row.student_id] = (monthlyCountMap[row.student_id] || 0) + 1
    })

    // 5. Format date: "2026-03-13" → "13.03.2026"
    const [y, m, d] = date.split('-')
    const formattedDate = `${d}.${m}.${y}`

    // 6. Send SMS to each absent student
    let sent = 0
    let failed = 0

    for (const rec of absentList) {
      const student = rec.students as { full_name: string; parent_phone: string } | null
      const phone   = student?.parent_phone
      const name    = student?.full_name || 'Talaba'
      const oyYoq   = String(monthlyCountMap[rec.student_id] || 1)

      if (!phone) {
        failed++
        await supabase.from('sms_history').insert({
          student_id: rec.student_id,
          phone: null,
          message: null,
          status: 'failed',
          error_msg: 'Telefon raqami kiritilmagan',
        })
        continue
      }

      // Replace all supported variables
      const message = templateBody
        .replace(/\{ism\}/g, name)
        .replace(/\{guruh\}/g, groupName)
        .replace(/\{sana\}/g, formattedDate)
        .replace(/\{oy_yoq\}/g, oyYoq)

      let status: 'sent' | 'failed' = 'sent'
      let errorMsg: string | null = null

      try {
        await sendOne(smsToken, phone, message, smsFrom)
        sent++
      } catch (e) {
        failed++
        status = 'failed'
        errorMsg = (e as Error).message
      }

      if (status === 'sent') {
        await supabase
          .from('attendance')
          .update({ sms_sent: true })
          .eq('id', rec.id)
      }

      await supabase.from('sms_history').insert({
        student_id: rec.student_id,
        phone,
        message,
        status,
        error_msg: errorMsg,
      })
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('sms-sender error:', err)
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
