/**
 * Date helpers. Everything is computed in the browser's local timezone and
 * serialised as a plain YYYY-MM-DD string, which is what the `date` columns
 * store. Never use toISOString() for this -- it shifts to UTC and can hand you
 * yesterday's date late in the evening.
 */

export function isoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey() {
  return isoDate()
}

/** Monday of the ISO week containing `date`. */
export function weekKey(date = new Date()) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Mon = 0 ... Sun = 6
  d.setDate(d.getDate() - day)
  return isoDate(d)
}

/** First of the month containing `date`. */
export function monthKey(date = new Date()) {
  return isoDate(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function periodKey(cadence, date = new Date()) {
  if (cadence === 'weekly') return weekKey(date)
  if (cadence === 'monthly') return monthKey(date)
  return isoDate(date)
}

/** Array of the last `n` YYYY-MM-DD strings, most recent first. */
export function lastNDays(n, from = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(from)
    d.setDate(d.getDate() - i)
    return isoDate(d)
  })
}

export function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + delta)
  return isoDate(date)
}

/**
 * Consecutive days on which every daily habit was logged.
 * Today is allowed to be incomplete without breaking the streak -- it only
 * stops counting once yesterday comes up short.
 */
export function computeStreak(logDates, dailyHabitCount) {
  if (!dailyHabitCount) return 0

  const counts = new Map()
  for (const date of logDates) counts.set(date, (counts.get(date) ?? 0) + 1)

  let streak = 0
  let cursor = todayKey()

  if ((counts.get(cursor) ?? 0) < dailyHabitCount) {
    cursor = addDays(cursor, -1) // today still in progress
  }

  while ((counts.get(cursor) ?? 0) >= dailyHabitCount) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** The 7 date keys of the current ISO week, Monday first. */
export function currentWeekDays(from = new Date()) {
  const monday = weekKey(from)
  return DAY_LABELS.map((label, i) => ({ label, date: addDays(monday, i) }))
}

export function formatRelative(timestamp) {
  if (!timestamp) return ''
  const then = new Date(timestamp).getTime()
  const diff = Math.round((Date.now() - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatLongDate(date = new Date()) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
