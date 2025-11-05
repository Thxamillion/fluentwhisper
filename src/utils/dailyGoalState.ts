import { Check, Flame } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

export interface DailyGoalState {
  displayValue: string
  subtitle: string
  progress: number // percentage (0-100+)
  statusIcon?: LucideIcon
  subtitleClassName?: string
}

/**
 * Calculate daily goal state and display values
 */
export function calculateDailyGoalState(
  minutesCompleted: number,
  goalMinutes: number
): DailyGoalState {
  const progress = goalMinutes > 0 ? (minutesCompleted / goalMinutes) * 100 : 0
  const remainingMinutes = Math.max(0, goalMinutes - minutesCompleted)
  const bonusMinutes = Math.max(0, minutesCompleted - goalMinutes)

  // State 0: Not started
  if (minutesCompleted === 0) {
    return {
      displayValue: `0/${goalMinutes}`,
      subtitle: 'Get started!',
      progress: 0,
      subtitleClassName: 'text-xs text-muted-foreground'
    }
  }

  // State 1-99%: In progress
  if (progress < 100) {
    return {
      displayValue: `${minutesCompleted}/${goalMinutes}`,
      subtitle: `${remainingMinutes} min to go`,
      progress,
      subtitleClassName: 'text-xs text-blue-600 dark:text-blue-400'
    }
  }

  // State 100-149%: Goal reached
  if (progress < 150) {
    return {
      displayValue: `${minutesCompleted}/${goalMinutes}`,
      subtitle: 'Goal reached!',
      progress,
      statusIcon: Check,
      subtitleClassName: 'text-xs text-green-600 dark:text-green-400'
    }
  }

  // State 150%+: Overachiever
  return {
    displayValue: `${Math.round(progress)}%`,
    subtitle: `+${bonusMinutes} min bonus`,
    progress,
    statusIcon: Flame,
    subtitleClassName: 'text-xs text-amber-600 dark:text-amber-400'
  }
}
