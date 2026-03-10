/**
 * Returns today's date in YYYY-MM-DD format (local time).
 */
export function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formats a date string to Uzbek locale (e.g. "9-mart, 2026").
 */
export function formatDateUz(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Formats phone number for Eskiz (removes +, spaces, dashes).
 * Input: "+998 90 123 45 67" → Output: "998901234567"
 */
export function normalizePhone(phone) {
  return phone.replace(/[^0-9]/g, '')
}
