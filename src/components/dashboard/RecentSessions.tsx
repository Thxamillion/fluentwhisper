import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SessionData } from '@/services/sessions/types'
import { formatRelativeTime, formatMinutes } from '@/utils/dateFormatting'

interface RecentSessionsProps {
  sessions: SessionData[]
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  const navigate = useNavigate()

  return (
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
        {sessions.length > 0 ? (
          sessions.map((session) => (
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
  )
}
