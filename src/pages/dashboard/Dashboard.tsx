import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Leaf } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - 2 cards stacked */}
        <div className="col-span-2 space-y-6">
          {/* Today / Record */}
          <Card>
            <CardHeader>
              <CardTitle>Today / Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 p-4 bg-orange-50 rounded-lg">
                <div className="w-16 h-16 bg-orange-200 rounded-lg flex items-center justify-center">
                  <Leaf className="w-8 h-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg">Today's Recording</h3>
                  <p className="text-sm text-muted-foreground">Lingua Session - 24 May 2024</p>
                </div>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Snapshot */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Snapshot</CardTitle>
                <Badge variant="secondary" className="text-green-600 bg-green-50">
                  +10% vs Last 7 Days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
                <div className="w-full h-full relative">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    <path
                      d="M 20 150 Q 50 100 80 120 T 140 110 T 200 130 T 260 90 T 320 110 T 380 80"
                      stroke="#22c55e"
                      strokeWidth="3"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 2 cards stacked */}
        <div className="space-y-6">
          {/* Streak */}
          <Card>
            <CardHeader>
              <CardTitle>Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">3 days</div>
              <div className="text-sm text-muted-foreground mb-4">Daily Usage</div>
              <div className="text-2xl font-bold">15 min</div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium">
                  <div>DATE</div>
                  <div>LESSON</div>
                  <div>DURATION</div>
                  <div>SCORE</div>
                </div>
                {[
                  { date: 'May 20', lesson: 'Lesson 1', duration: '10 min', score: '85%', color: 'text-green-600' },
                  { date: 'May 19', lesson: 'Lesson 2', duration: '15 min', score: '90%', color: 'text-green-600' },
                  { date: 'May 18', lesson: 'Lesson 3', duration: '20 min', score: '75%', color: 'text-yellow-600' },
                  { date: 'May 17', lesson: 'Lesson 4', duration: '12 min', score: '65%', color: 'text-red-600' },
                ].map((session) => (
                  <div key={session.date} className="grid grid-cols-4 gap-2 text-sm">
                    <div className="font-medium">{session.date}</div>
                    <div>{session.lesson}</div>
                    <div>{session.duration}</div>
                    <div className={session.color}>{session.score}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Heatmap - Full width */}
        <div className="col-span-3 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Calendar Heatmap</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">‹</Button>
                  <span className="font-medium">May 2024</span>
                  <Button variant="ghost" size="sm">›</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                <div className="text-center text-xs text-muted-foreground font-medium">S</div>
                <div className="text-center text-xs text-muted-foreground font-medium">M</div>
                <div className="text-center text-xs text-muted-foreground font-medium">T</div>
                <div className="text-center text-xs text-muted-foreground font-medium">W</div>
                <div className="text-center text-xs text-muted-foreground font-medium">T</div>
                <div className="text-center text-xs text-muted-foreground font-medium">F</div>
                <div className="text-center text-xs text-muted-foreground font-medium">S</div>

                {/* Empty cells for start of month */}
                <div></div><div></div><div></div><div></div><div></div><div></div>

                {/* Calendar days */}
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1;
                  let bgColor = 'bg-gray-100';

                  if (day === 5) bgColor = 'bg-blue-500 text-white';
                  else if (day === 15) bgColor = 'bg-green-400';
                  else if (day === 19) bgColor = 'bg-green-500';
                  else if (day === 20) bgColor = 'bg-green-500';
                  else if (day === 27) bgColor = 'bg-green-400';
                  else if (day === 28) bgColor = 'bg-yellow-400';
                  else if (day === 30) bgColor = 'bg-red-400';

                  return (
                    <div
                      key={day}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${bgColor}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vocabulary Inbox - Full width */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Vocabulary Inbox</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-xs text-muted-foreground font-medium">WORD</div>
                <div className="text-xs text-muted-foreground font-medium">DEFINITION</div>
                <div className="text-xs text-muted-foreground font-medium">EXAMPLE</div>

                <div className="font-medium">Bonjour</div>
                <div>Hello</div>
                <div className="text-muted-foreground italic">"Bonjour, comment allez-vous ?"</div>

                <div className="font-medium">Merci</div>
                <div>Thank you</div>
                <div className="text-muted-foreground italic">"Merci beaucoup pour votre aide."</div>

                <div className="font-medium">Au revoir</div>
                <div>Goodbye</div>
                <div className="text-muted-foreground italic">"Au revoir, à bientôt."</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}