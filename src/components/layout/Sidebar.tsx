import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Mic,
  BookOpen,
  History,
  BookText,
  TrendingUp,
  Settings,
  FlaskConical
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Record', href: '/record', icon: Mic },
  { name: 'Library', href: '/library', icon: BookOpen },
  { name: 'History', href: '/history', icon: History },
  { name: 'Vocabulary', href: '/vocabulary', icon: BookText },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Test Langpack', href: '/test', icon: FlaskConical },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <div className="w-64 bg-background border-r flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">F</span>
          </div>
          <span className="text-xl font-bold">Fluent</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const IconComponent = item.icon
            return (
              <li key={item.name}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    'w-full justify-start space-x-3',
                    isActive && 'bg-secondary text-secondary-foreground'
                  )}
                  asChild
                >
                  <Link to={item.href}>
                    <IconComponent className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}