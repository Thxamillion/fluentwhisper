import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame, Loader2 } from 'lucide-react'
import { DailySessionCount } from '@/services/stats/types'

interface CalendarDay {
  date: string | null
  day: number | null
  minutes: number
  isToday?: boolean
}

interface CalendarData {
  days: CalendarDay[]
  monthName: string
}

interface PracticeCalendarProps {
  dailySessions: DailySessionCount[] | undefined
  isLoading: boolean
  dailyGoalMinutes: number
}

/**
 * Generates calendar data for the current month with total minutes
 */
function generateCalendarData(dailySessions: DailySessionCount[] | undefined): CalendarData {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const firstDayOfWeek = firstDay.getDay()

  const days: CalendarDay[] = []

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, day: null, minutes: 0 })
  }

  // Add all days in month with total minutes
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dateStr = date.toISOString().split('T')[0]

    // Find total minutes for this day
    const dayData = dailySessions?.find(d => d.date === dateStr)
    const minutes = dayData?.totalMinutes || 0

    days.push({
      date: dateStr,
      day,
      minutes,
      isToday: day === now.getDate()
    })
  }

  return {
    days,
    monthName: firstDay.toLocaleString('default', { month: 'long', year: 'numeric' })
  }
}

/**
 * Returns the appropriate heatmap color based on minutes and daily goal
 */
function getHeatmapColor(minutes: number, dailyGoalMinutes: number): string {
  if (minutes === 0) return 'bg-gray-100 dark:bg-gray-800'

  const percentage = (minutes / dailyGoalMinutes) * 100

  if (percentage < 25) return 'bg-green-200 dark:bg-green-900'   // 1-24%
  if (percentage < 50) return 'bg-green-400 dark:bg-green-700'   // 25-49%
  if (percentage < 75) return 'bg-green-500 dark:bg-green-600'   // 50-74%
  return 'bg-green-600 dark:bg-green-500'                        // 75%+
}

export function PracticeCalendar({ dailySessions, isLoading, dailyGoalMinutes }: PracticeCalendarProps) {
  const calendarData = generateCalendarData(dailySessions)

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Practice Calendar
        </CardTitle>
        <p className="text-xs text-muted-foreground">{calendarData.monthName}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarData.days.map((day, index) => {
                const percentage = day.minutes > 0 ? Math.round((day.minutes / dailyGoalMinutes) * 100) : 0
                return (
                  <div
                    key={index}
                    className={`
                      aspect-square rounded flex items-center justify-center text-xs font-medium
                      ${day.date ? getHeatmapColor(day.minutes, dailyGoalMinutes) : 'bg-transparent'}
                      ${day.date ? 'cursor-pointer hover:ring-2 hover:ring-gray-400 transition-all' : ''}
                      ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                      ${day.minutes > 0 ? 'text-white' : 'text-gray-700 dark:text-gray-300'}
                    `}
                    title={day.date ? `${day.date}: ${day.minutes} min (${percentage}% of goal)` : ''}
                  >
                    {day.day}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-800 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1.5">
                {[0, Math.round(dailyGoalMinutes * 0.12), Math.round(dailyGoalMinutes * 0.37), Math.round(dailyGoalMinutes * 0.62), Math.round(dailyGoalMinutes * 0.87)].map((minutes, idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded ${getHeatmapColor(minutes, dailyGoalMinutes)}`}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
