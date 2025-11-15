/**
 * Session statistics calculation utilities
 */

import { SessionData } from '@/services/sessions/types'
import { isToday, isWithinDays } from './dateFormatting'

/**
 * Calculate today's session statistics
 * Returns total seconds (not rounded minutes) to avoid cumulative rounding errors
 * Only includes WPM-eligible sessions (free_speak and read_aloud)
 */
export function calculateTodayStats(sessions: SessionData[]) {
  // Filter for today's WPM-eligible sessions (exclude tutor and conversation)
  const todaySessions = sessions.filter(s =>
    isToday(s.startedAt) &&
    (s.sessionType === 'free_speak' || s.sessionType === 'read_aloud')
  )

  // Sum raw seconds first, then caller can format as needed
  const totalSeconds = todaySessions.reduce(
    (sum, s) => sum + (s.duration || 0),
    0
  )

  return {
    sessions: todaySessions.length,
    seconds: totalSeconds,
    minutes: Math.floor(totalSeconds / 60), // Floor instead of round for accuracy
    newWords: todaySessions.reduce(
      (sum, s) => sum + (s.newWordCount || 0),
      0
    )
  }
}

/**
 * Calculate this week's session statistics (last 7 days)
 * Returns total seconds (not rounded minutes) to avoid cumulative rounding errors
 * Only includes WPM-eligible sessions (free_speak and read_aloud)
 */
export function calculateWeekStats(sessions: SessionData[]) {
  // Filter for this week's WPM-eligible sessions (exclude tutor and conversation)
  const weekSessions = sessions.filter(s =>
    isWithinDays(s.startedAt, 7) &&
    (s.sessionType === 'free_speak' || s.sessionType === 'read_aloud')
  )

  // Sum raw seconds first, then caller can format as needed
  const totalSeconds = weekSessions.reduce(
    (sum, s) => sum + (s.duration || 0),
    0
  )

  return {
    sessions: weekSessions.length,
    seconds: totalSeconds,
    minutes: Math.floor(totalSeconds / 60), // Floor instead of round for accuracy
    newWords: weekSessions.reduce(
      (sum, s) => sum + (s.newWordCount || 0),
      0
    )
  }
}

/**
 * Calculate WPM change percentage between this week and last week
 */
export function calculateWpmChange(wpmTrends: { date: string; avgWpm: number }[]) {
  if (!wpmTrends || wpmTrends.length === 0) return 0

  const now = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const thisWeek = wpmTrends.filter(t => new Date(t.date) >= weekAgo)
  const lastWeek = wpmTrends.filter(t => new Date(t.date) < weekAgo)

  if (thisWeek.length === 0 || lastWeek.length === 0) return 0

  const avgThisWeek = thisWeek.reduce((sum, t) => sum + t.avgWpm, 0) / thisWeek.length
  const avgLastWeek = lastWeek.reduce((sum, t) => sum + t.avgWpm, 0) / lastWeek.length

  if (avgLastWeek === 0) return 0

  return Math.round(((avgThisWeek - avgLastWeek) / avgLastWeek) * 100)
}

/**
 * Get most recent N sessions, sorted by date
 */
export function getRecentSessions(sessions: SessionData[], limit: number = 4) {
  return [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
}
