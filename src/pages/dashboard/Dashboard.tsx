import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic, TrendingUp, Clock, Flame, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useOverallStats, useDailySessions, useWpmTrends } from '@/hooks/stats'
import { useAllSessions } from '@/hooks/sessions'
import { useRecentVocab } from '@/hooks/vocabulary'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatRelativeTime, formatMinutes } from '@/utils/dateFormatting'
import { calculateTodayStats, calculateWeekStats, calculateWpmChange, getRecentSessions } from '@/utils/sessionStats'
import { DailyGoalModal } from '@/components/DailyGoalModal'

export function Dashboard() {
  const navigate = useNavigate()
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  // Fetch data from backend
  const { data: overallStats, isLoading: statsLoading } = useOverallStats()
  const { data: allSessions, isLoading: sessionsLoading } = useAllSessions()
  const { data: dailySessions, isLoading: calendarLoading } = useDailySessions(undefined, 31)
  const { data: wpmTrends, isLoading: wpmLoading } = useWpmTrends(undefined, 14)

  // Settings
  const { settings, updateSetting } = useSettingsStore()
  const dailyGoalMinutes = settings.dailyGoalMinutes

  // Get recent vocabulary (last 7 days, limit 12)
  const { data: recentVocab, isLoading: vocabLoading } = useRecentVocab(
    settings.targetLanguage as any,
    7,
    12
  )

  // Calculate derived stats
  const todayStats = allSessions ? calculateTodayStats(allSessions) : { sessions: 0, minutes: 0, newWords: 0 }
  const weekStats = allSessions ? calculateWeekStats(allSessions) : { sessions: 0, minutes: 0, newWords: 0 }
  const wpmChange = wpmTrends ? calculateWpmChange(wpmTrends) : 0
  const recentSessions = allSessions ? getRecentSessions(allSessions, 4) : []

  // Loading state
  const isLoading = statsLoading || sessionsLoading

  const handleSaveGoal = (newGoal: number) => {
    updateSetting('dailyGoalMinutes', newGoal)
  }

  // Generate calendar data for current month
  const generateCalendarData = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const firstDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, day: null, minutes: 0 })
    }

    // Add all days in month with session counts
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

    return { days, monthName: firstDay.toLocaleString('default', { month: 'long', year: 'numeric' }) }
  }

  const calendarData = generateCalendarData()

  const getHeatmapColor = (minutes: number) => {
    if (minutes === 0) return 'bg-gray-100 dark:bg-gray-800'

    const percentage = (minutes / dailyGoalMinutes) * 100

    if (percentage < 25) return 'bg-green-200 dark:bg-green-900'   // 1-24%
    if (percentage < 50) return 'bg-green-400 dark:bg-green-700'   // 25-49%
    if (percentage < 75) return 'bg-green-500 dark:bg-green-600'   // 50-74%
    return 'bg-green-600 dark:bg-green-500'                        // 75%+
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Quick Start Banner */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Ready to practice?</h2>
              <p className="text-xs text-muted-foreground">Start a new recording session</p>
            </div>
            <Button
              size="sm"
              className="h-9 px-4"
              onClick={() => navigate('/record')}
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state for stats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Row - 4 compact cards */}
          <div className="grid grid-cols-4 gap-3">
            {/* Streak */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Streak</span>
                </div>
                <div className="text-2xl font-bold">{overallStats?.currentStreakDays || 0}</div>
                <p className="text-xs text-muted-foreground">
                  days • best: {overallStats?.longestStreakDays || 0}
                </p>
              </CardContent>
            </Card>

            {/* Today - Clickable to edit goal */}
            <Card
              className="border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              onClick={() => setGoalModalOpen(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Daily Goal</span>
                </div>
                <div className="text-2xl font-bold">{todayStats.sessions}</div>
                <p className="text-xs text-muted-foreground">
                  {todayStats.minutes}/{dailyGoalMinutes} min goal
                </p>
              </CardContent>
            </Card>

            {/* This Week */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>This Week</span>
                </div>
                <div className="text-2xl font-bold">{weekStats.minutes}m</div>
                <p className="text-xs text-muted-foreground">+{weekStats.newWords} words</p>
              </CardContent>
            </Card>

            {/* Avg WPM */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Avg WPM</span>
                </div>
                <div className="text-2xl font-bold">
                  {overallStats?.averageWpm ? Math.round(overallStats.averageWpm) : 0}
                </div>
                <p className={`text-xs ${wpmChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {wpmChange >= 0 ? '↑' : '↓'} {Math.abs(wpmChange)}% vs last week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sessions */}
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Sessions</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigate('/history')}
                >
                  View all
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/session/${session.id}`)}
                    className="w-full text-left px-3 py-2 rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatRelativeTime(session.startedAt)}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatMinutes(session.duration || 0)}m</span>
                        <span>•</span>
                        <span>{Math.round(session.wpm || 0)} WPM</span>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400">
                          {session.newWordCount || 0} new
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No sessions yet</p>
                  <p className="text-xs mt-1">Start recording to see your progress here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Row: New Words + Calendar */}
          <div className="grid grid-cols-2 gap-4">
            {/* New Words This Week */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    New Words This Week
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate('/vocabulary')}
                  >
                    View all
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col" style={{ height: 'calc(100% - 3.5rem)' }}>
                {vocabLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentVocab && recentVocab.length > 0 ? (
                  <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                    {recentVocab.map((word) => (
                      <div
                        key={word.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <span className="text-sm font-medium">{word.lemma}</span>
                        <span className="text-xs text-muted-foreground">
                          {word.translation || 'No translation'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col justify-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No new words yet</p>
                    <p className="text-xs mt-1">Start practicing to discover new vocabulary</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Practice Calendar */}
            <Card className="border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Practice Calendar
                </CardTitle>
                <p className="text-xs text-muted-foreground">{calendarData.monthName}</p>
              </CardHeader>
              <CardContent>
                {calendarLoading ? (
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
                              ${day.date ? getHeatmapColor(day.minutes) : 'bg-transparent'}
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
                            className={`w-4 h-4 rounded ${getHeatmapColor(minutes)}`}
                          />
                        ))}
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Daily Goal Modal */}
      <DailyGoalModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        currentGoal={dailyGoalMinutes}
        onSave={handleSaveGoal}
      />
    </div>
  )
}
