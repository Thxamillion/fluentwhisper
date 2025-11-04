import { useState } from 'react'
import { TrendingUp, Clock, Flame, Loader2 } from 'lucide-react'
import { useOverallStats, useDailySessions, useWpmTrends } from '@/hooks/stats'
import { useAllSessions } from '@/hooks/sessions'
import { useRecentVocab } from '@/hooks/vocabulary'
import { useSettingsStore } from '@/stores/settingsStore'
import { calculateTodayStats, calculateWeekStats, calculateWpmChange, getRecentSessions } from '@/utils/sessionStats'
import { DailyGoalModal } from '@/components/DailyGoalModal'
import { StatCard, QuickStartBanner, RecentSessions, NewWords, PracticeCalendar } from '@/components/dashboard'

export function Dashboard() {
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
    settings.primaryLanguage as any,
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <QuickStartBanner />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={Flame}
              label="Streak"
              value={overallStats?.currentStreakDays || 0}
              subtitle={`days • best: ${overallStats?.longestStreakDays || 0}`}
            />

            <StatCard
              icon={Clock}
              label="Daily Goal"
              value={todayStats.sessions}
              subtitle={`${todayStats.minutes}/${dailyGoalMinutes} min goal`}
              onClick={() => setGoalModalOpen(true)}
            />

            <StatCard
              icon={TrendingUp}
              label="This Week"
              value={`${weekStats.minutes}m`}
              subtitle={`+${weekStats.newWords} words`}
            />

            <StatCard
              icon={TrendingUp}
              label="Avg WPM"
              value={overallStats?.averageWpm ? Math.round(overallStats.averageWpm) : 0}
              subtitle={`${wpmChange >= 0 ? '↑' : '↓'} ${Math.abs(wpmChange)}% vs last week`}
              subtitleClassName={`text-xs ${wpmChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            />
          </div>

          <RecentSessions sessions={recentSessions} />

          <div className="grid grid-cols-2 gap-4">
            <NewWords words={recentVocab} isLoading={vocabLoading} />
            <PracticeCalendar
              dailySessions={dailySessions}
              isLoading={calendarLoading}
              dailyGoalMinutes={dailyGoalMinutes}
            />
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
