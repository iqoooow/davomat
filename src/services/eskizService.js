import { supabase } from './supabaseClient'

/**
 * Sends SMS via the Supabase Edge Function `send-sms`.
 * The Edge Function holds the Eskiz API token securely server-side.
 *
 * @param {string} phone   - Recipient phone e.g. "998901234567"
 * @param {string} message - SMS text
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendSms(phone, message) {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { phone, message },
    })

    if (error) {
      console.error('Edge function error:', error)
      return { success: false, error: error.message }
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'SMS yuborishda xatolik' }
    }

    return { success: true }
  } catch (err) {
    console.error('sendSms caught error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Sends SMS to all absent students and marks sms_sent = true.
 *
 * @param {Array} absentRecords - Array from attendanceService.getAbsentUnsent()
 * @param {Function} onMarkSent - Callback(attendanceId) to mark record in DB
 * @returns {Promise<{sent: number, failed: number, errors: string[]}>}
 */
export async function sendAbsentSms(absentRecords, onMarkSent) {
  let sent = 0
  let failed = 0
  const errors = []

  for (const record of absentRecords) {
    const phone = record.students?.parent_phone
    const studentName = record.students?.full_name

    if (!phone) {
      failed++
      errors.push(`${studentName}: telefon raqami topilmadi`)
      continue
    }

    const message = `Hurmatli ota-ona, farzandingiz ${studentName} bugun darsga kelmadi.`

    const result = await sendSms(phone, message)

    if (result.success) {
      await onMarkSent(record.id)
      sent++
    } else {
      failed++
      errors.push(`${studentName}: ${result.error}`)
    }
  }

  return { sent, failed, errors }
}
