import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEVSMS_URL = 'https://devsms.uz/api/send_sms.php'
const UZB_OFFSET_MS = 5 * 60 * 60 * 1000 // UTC+5

async function sendSms(token: string, phone: string, message: string, from: string) {
  const res = await fetch(DEVSMS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: phone.replace(/[^0-9]/g, ''), message, from }),
  })
  if (!res.ok) throw new Error(`DevSMS ${res.status}: ${await res.text()}`)
  const json = await res.json()
  if (!json?.success) throw new Error(`DevSMS error: ${JSON.stringify(json)}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const smsToken    = Deno.env.get('DEVSMS_TOKEN')!
    const smsFrom     = Deno.env.get('DEVSMS_FROM') || '4546'

    if (!smsToken) throw new Error('DEVSMS_TOKEN not set')

    const db = createClient(supabaseUrl, serviceKey)

    // Current time in Uzbekistan (UTC+5)
    const nowUTC = new Date()
    const nowUZB = new Date(nowUTC.getTime() + UZB_OFFSET_MS)
    const todayDay   = nowUZB.getDay() // 0=Sunday, 1=Monday, ...
    const currentMins = nowUZB.getHours() * 60 + nowUZB.getMinutes()
    const todayDate  = nowUZB.toISOString().split('T')[0] // YYYY-MM-DD in UZB

    // Get admin phone from sms_settings
    const { data: phoneSetting } = await db
      .from('sms_settings')
      .select('value')
      .eq('key', 'admin_phone')
      .single()

    const adminPhone = phoneSetting?.value?.trim()
    if (!adminPhone) {
      return new Response(
        JSON.stringify({ success: false, message: 'Admin phone not configured in SMS sozlamalari' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all groups with schedule
    const { data: groups, error: gErr } = await db
      .from('groups')
      .select('id, name, schedule_days, schedule_start, schedule_end, reminder_sent_at')

    if (gErr) throw gErr

    let remindersCount = 0
    const skipped: string[] = []

    for (const group of (groups || [])) {
      const days = group.schedule_days as number[] | null

      // Skip groups without schedule
      if (!days?.length || !group.schedule_start || !group.schedule_end) continue

      // Skip if today is not a scheduled day
      if (!days.includes(todayDay)) continue

      // Parse end time "HH:MM:SS" → minutes
      const [endH, endM] = (group.schedule_end as string).split(':').map(Number)
      const endMins = endH * 60 + endM

      // Reminder window: 40 min before end → 20 min before end (20-min window)
      // e.g. class ends 16:00 → window is 15:20–15:40
      if (currentMins < endMins - 40 || currentMins > endMins - 20) {
        skipped.push(`${group.name} (outside window)`)
        continue
      }

      // Skip if reminder already sent today (UZB date)
      if (group.reminder_sent_at) {
        const sentUZB = new Date(new Date(group.reminder_sent_at).getTime() + UZB_OFFSET_MS)
        if (sentUZB.toISOString().split('T')[0] === todayDate) {
          skipped.push(`${group.name} (already sent)`)
          continue
        }
      }

      // Check if any attendance was taken for this group today
      const { data: sg } = await db
        .from('student_groups')
        .select('student_id')
        .eq('group_id', group.id)

      if (!sg?.length) continue // no students

      const studentIds = (sg as { student_id: string }[]).map(r => r.student_id)

      const { count } = await db
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .in('student_id', studentIds)
        .eq('date', todayDate)

      if ((count ?? 0) > 0) {
        skipped.push(`${group.name} (attendance taken)`)
        continue
      }

      // Build reminder message
      const [startH, startM] = (group.schedule_start as string).split(':').map(Number)
      const fmt = (h: number, m: number) =>
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const message =
        `Eslatma: "${group.name}" guruhi (${fmt(startH, startM)}-${fmt(endH, endM)}) uchun bugun davomat hali olinmadi!`

      try {
        await sendSms(smsToken, adminPhone, message, smsFrom)
        await db
          .from('groups')
          .update({ reminder_sent_at: nowUTC.toISOString() })
          .eq('id', group.id)
        remindersCount++
      } catch (e) {
        console.error(`Reminder SMS failed for "${group.name}":`, e)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersCount,
        skipped,
        checked_at_uzb: nowUZB.toISOString(),
        current_day: todayDay,
        current_time: `${String(nowUZB.getHours()).padStart(2,'0')}:${String(nowUZB.getMinutes()).padStart(2,'0')}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('attendance-reminder error:', err)
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
