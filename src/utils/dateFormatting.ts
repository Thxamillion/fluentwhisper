/**
 * Date formatting utilities for dashboard
 */

/**
 * Format a Unix timestamp as a relative time string
 * e.g., "Today, 3:45 PM", "Yesterday, 2:20 PM", "3 days ago, 4:10 PM"
 */
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()

  // Compare calendar days by normalizing to midnight
  const dateAtMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = nowAtMidnight.getTime() - dateAtMidnight.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  if (diffDays === 0) return `Today, ${timeStr}`
  if (diffDays === 1) return `Yesterday, ${timeStr}`
  if (diffDays < 7) return `${diffDays} days ago, ${timeStr}`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

/**
 * Check if a Unix timestamp is from today
 */
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp * 1000)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

/**
 * Check if a Unix timestamp is within the last N days
 */
export function isWithinDays(timestamp: number, days: number): boolean {
  const date = new Date(timestamp * 1000)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}

/**
 * Get the start of today (midnight) as Unix timestamp
 */
export function getStartOfToday(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor(today.getTime() / 1000)
}

/**
 * Get the start of N days ago (midnight) as Unix timestamp
 */
export function getStartOfDaysAgo(days: number): number {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

/**
 * Format seconds as minutes (rounded)
 */
export function formatMinutes(seconds: number): number {
  return Math.round(seconds / 60)
}
