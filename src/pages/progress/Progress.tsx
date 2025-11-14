import { useState } from 'react';
import { useOverallStats, useTopWords, useDailySessions, useWpmTrends, useVocabGrowth } from '@/hooks/stats';
import { Loader2, Clock, BookOpen, TrendingUp, Flame, Target, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export function Progress() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('es');

  const { data: stats, isLoading: statsLoading } = useOverallStats(selectedLanguage);
  const { data: topWords, isLoading: wordsLoading } = useTopWords(selectedLanguage, 10);
  const { data: wpmTrends } = useWpmTrends(selectedLanguage, 30);
  const { data: vocabGrowth } = useVocabGrowth(selectedLanguage);

  const formatHours = (seconds: number) => {
    return Math.floor(seconds / 3600);
  };

  const formatMinutes = (seconds: number) => {
    return Math.floor(seconds / 60);
  };

  /**
   * Format a date string (YYYY-MM-DD) as a local date without UTC conversion
   * Backend returns local dates, so we need to parse them as local, not UTC
   */
  const formatLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalHours = formatHours(stats?.totalSpeakingTimeSeconds || 0);
  const totalMinutes = formatMinutes(stats?.totalSpeakingTimeSeconds || 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Progress</h1>
          <p className="text-muted-foreground">Long-term learning journey and achievements</p>
        </div>

        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">French</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
          {/* LEFT SIDEBAR - Overall Stats */}
          <div className="space-y-6">
            {/* Key Achievements */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">All-Time Stats</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                  <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                    <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Total Vocabulary</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalVocabularySize || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-orange-50 dark:bg-orange-500/10 rounded-lg">
                  <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
                    <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Best Streak</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.longestStreakDays || 0} days</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-lg">
                  <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Average Speed</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.averageWpm ? Math.round(stats.averageWpm) : 0} WPM</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalSessions || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Avg New Words/Session</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats?.avgNewWordsPerSession ? Math.round(stats.avgNewWordsPerSession) : 0}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* WPM Trends - Left Sidebar */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Speaking Speed Over Time</h3>

              {wpmTrends && wpmTrends.length > 0 ? (
                <div className="space-y-4">
                  <ChartContainer
                    config={{
                      wpm: {
                        label: "WPM",
                        color: "hsl(142, 76%, 36%)",
                      },
                    }}
                    className="h-64"
                  >
                    <LineChart data={wpmTrends} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatLocalDate}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        width={45}
                        label={{ value: 'WPM', angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 11, textAnchor: 'middle' } }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent labelFormatter={(label) => formatLocalDate(label as string)} />}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgWpm"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={3}
                        dot={{ fill: "hsl(142, 76%, 36%)", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ChartContainer>
                  <div className="flex items-center justify-around pt-4 border-t border-border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Current WPM</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {Math.round(wpmTrends[wpmTrends.length - 1]?.avgWpm || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Average WPM</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.averageWpm ? Math.round(stats.averageWpm) : 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Data Points</p>
                      <p className="text-2xl font-bold text-foreground">{wpmTrends.length}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p className="text-sm">No WPM data yet</p>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT MAIN CONTENT - Visualizations & Insights */}
          <div className="space-y-6 min-w-0">
            {/* Vocab Growth - Full Width */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Vocabulary Growth</h3>

              {vocabGrowth && vocabGrowth.length > 0 ? (
                <div className="space-y-4">
                  <ChartContainer
                    config={{
                      vocab: {
                        label: "Total Words",
                        color: "hsl(271, 76%, 53%)",
                      },
                    }}
                    className="h-64"
                  >
                    <AreaChart data={vocabGrowth} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatLocalDate}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        width={55}
                        label={{ value: 'Total Words', angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 11, textAnchor: 'middle' } }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent labelFormatter={(label) => formatLocalDate(label as string)} />}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeTotal"
                        stroke="hsl(271, 76%, 53%)"
                        fill="hsl(271, 76%, 53%)"
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <div className="flex items-center justify-around pt-4 border-t border-border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Recent Growth</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        +{vocabGrowth[vocabGrowth.length - 1]?.newWords || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Words</p>
                      <p className="text-2xl font-bold text-foreground">
                        {vocabGrowth[vocabGrowth.length - 1]?.cumulativeTotal || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Data Points</p>
                      <p className="text-2xl font-bold text-foreground">{vocabGrowth.length}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p className="text-sm">No vocabulary data yet</p>
                </div>
              )}
            </Card>

            {/* Top Practiced Words */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Most Practiced Words</h3>

              {wordsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : topWords && topWords.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {topWords.map((word, index) => (
                    <div key={word.lemma} className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{word.lemma}</p>
                        <p className="text-xs text-muted-foreground">{word.usageCount} times</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <div className="text-center">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">No vocabulary data yet</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
