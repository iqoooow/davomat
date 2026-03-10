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
    const { date, template_id, test_phone, test_message, student_ids } = body

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
    let templateBody = 'Hurmatli ota-ona, farzandingiz {student_name} bugun darsga kelmadi.'
    if (template_id) {
      const { data: tpl } = await supabase
        .from('sms_templates')
        .select('body')
        .eq('id', template_id)
        .single()
      if (tpl?.body) templateBody = tpl.body
    }

    // 2. Get absent students without SMS (filter by student_ids if provided)
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

    // 3. Send SMS to each absent student
    let sent = 0
    let failed = 0

    for (const rec of absentList) {
      const student = rec.students as { full_name: string; parent_phone: string } | null
      const phone   = student?.parent_phone
      const name    = student?.full_name || 'Talaba'

      if (!phone) {
        failed++
        continue
      }

      const formattedDate = new Date(date).toLocaleDateString('uz-UZ', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })

      const message = templateBody
        .replace('{student_name}', name)
        .replace('{date}', formattedDate)

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

      // Update attendance.sms_sent
      if (status === 'sent') {
        await supabase
          .from('attendance')
          .update({ sms_sent: true })
          .eq('id', rec.id)
      }

      // Log to sms_history
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
