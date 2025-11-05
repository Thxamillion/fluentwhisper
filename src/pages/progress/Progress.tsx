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

  const totalHours = formatHours(stats?.totalSpeakingTimeSeconds || 0);
  const totalMinutes = formatMinutes(stats?.totalSpeakingTimeSeconds || 0);

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Progress</h1>
          <p className="text-gray-600">Long-term learning journey and achievements</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 overflow-hidden">
          {/* LEFT SIDEBAR - Overall Stats */}
          <div className="space-y-6">
            {/* Total Practice Time Card */}
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <h2 className="text-sm font-semibold text-gray-700 mb-6">Total Practice Time</h2>

              {/* Big number display */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-6xl font-bold text-gray-900">{totalHours}</span>
                  <span className="text-2xl font-semibold text-gray-600">hours</span>
                </div>
                <p className="text-sm text-gray-600">{totalMinutes} minutes total</p>
              </div>

              {/* Visual bar showing progress toward milestones */}
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-700 mb-3">Progress Milestones</p>

                <div className="space-y-4">
                  {[10, 25, 50, 100, 200].map((milestone) => {
                    const isCompleted = totalHours >= milestone;
                    const isCurrent = totalHours < milestone && totalHours >= (milestone / 2);

                    return (
                      <div key={milestone} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isCompleted ? '✓' : milestone >= 100 ? milestone : ''}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-600'}`}>
                              {milestone} hours
                            </span>
                            {!isCompleted && isCurrent && (
                              <span className="text-xs text-blue-600 font-medium">
                                {milestone - totalHours} hrs to go
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{
                                width: isCompleted
                                  ? '100%'
                                  : isCurrent
                                  ? `${(totalHours / milestone) * 100}%`
                                  : '0%'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Key Achievements */}
            <Card className="p-6 bg-white">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">All-Time Stats</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Total Vocabulary</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalVocabularySize || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Flame className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Best Streak</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.longestStreakDays || 0} days</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Average Speed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.averageWpm ? Math.round(stats.averageWpm) : 0} WPM</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Total Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalSessions || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Avg New Words/Session</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.avgNewWordsPerSession ? Math.round(stats.avgNewWordsPerSession) : 0}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT MAIN CONTENT - Visualizations & Insights */}
          <div className="space-y-6 min-w-0">
            {/* WPM Trends - Full Width */}
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Speaking Speed Over Time</h3>
              </div>

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
                    <LineChart data={wpmTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'WPM', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
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
                  <div className="flex items-center justify-around pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Current WPM</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.round(wpmTrends[wpmTrends.length - 1]?.avgWpm || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Average WPM</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats?.averageWpm ? Math.round(stats.averageWpm) : 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Data Points</p>
                      <p className="text-2xl font-bold text-gray-900">{wpmTrends.length}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p className="text-sm">No WPM data yet</p>
                </div>
              )}
            </Card>

            {/* Vocab Growth - Full Width */}
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Vocabulary Growth</h3>
              </div>

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
                    <AreaChart data={vocabGrowth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Total Words', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
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
                  <div className="flex items-center justify-around pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Recent Growth</p>
                      <p className="text-2xl font-bold text-purple-600">
                        +{vocabGrowth[vocabGrowth.length - 1]?.newWords || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Total Words</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {vocabGrowth[vocabGrowth.length - 1]?.cumulativeTotal || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Data Points</p>
                      <p className="text-2xl font-bold text-gray-900">{vocabGrowth.length}</p>
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
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Most Practiced Words</h3>
              </div>

              {wordsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : topWords && topWords.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {topWords.map((word, index) => (
                    <div key={word.lemma} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{word.lemma}</p>
                        <p className="text-xs text-gray-600">{word.usageCount} times</p>
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
