import { useState } from 'react';
import { useOverallStats, useTopWords } from '@/hooks/stats';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Analytics() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('es');

  const { data: stats, isLoading: statsLoading } = useOverallStats(selectedLanguage);
  const { data: topWords, isLoading: wordsLoading } = useTopWords(selectedLanguage, 10);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress Dashboard</h1>
        <p className="text-gray-600">Track your language learning journey with detailed insights and metrics.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-8">
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

      {/* Key Metrics */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Sessions</h3>
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats?.totalSessions || 0}</div>
              <div className="text-xs text-gray-500">All time</div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Speaking Time</h3>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {stats ? formatTime(stats.totalSpeakingTimeSeconds) : '0m'}
              </div>
              <div className="text-xs text-gray-500">All time</div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Vocabulary Size</h3>
              <div className="text-3xl font-bold text-purple-600 mb-1">{stats?.totalVocabularySize || 0}</div>
              <div className="text-xs text-gray-500">Unique words</div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Average WPM</h3>
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {stats?.averageWpm ? Math.round(stats.averageWpm) : 0}
              </div>
              <div className="text-xs text-gray-500">Words per minute</div>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Current Streak</h3>
              <div className="text-3xl font-bold text-red-600 mb-1">
                🔥 {stats?.currentStreakDays || 0}
              </div>
              <div className="text-xs text-gray-500">Days in a row</div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Longest Streak</h3>
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {stats?.longestStreakDays || 0}
              </div>
              <div className="text-xs text-gray-500">Days</div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Unique Words</h3>
              <div className="text-3xl font-bold text-indigo-600 mb-1">
                {stats?.avgUniqueWordsPerSession ? Math.round(stats.avgUniqueWordsPerSession) : 0}
              </div>
              <div className="text-xs text-gray-500">Per session</div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Avg New Words</h3>
              <div className="text-3xl font-bold text-teal-600 mb-1">
                {stats?.avgNewWordsPerSession ? Math.round(stats.avgNewWordsPerSession) : 0}
              </div>
              <div className="text-xs text-gray-500">Per session</div>
            </Card>
          </div>
        </>
      )}

      {/* Top Words */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Most Practiced Words (Top 10)</h3>
        {wordsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : topWords && topWords.length > 0 ? (
          <div className="space-y-3">
            {topWords.map((word, index) => (
              <div key={word.lemma} className="flex items-center">
                <div className="w-8 text-sm font-medium text-gray-600">#{index + 1}</div>
                <div className="flex-1 mx-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{word.lemma}</span>
                    <span className="text-sm text-gray-600">{word.usageCount} times</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(word.usageCount / (topWords[0]?.usageCount || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  {word.formsSpoken.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Forms: {word.formsSpoken.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            No vocabulary data yet. Start practicing to see your most used words!
          </div>
        )}
      </Card>
    </div>
  )
}