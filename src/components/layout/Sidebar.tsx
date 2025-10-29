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
  FlaskConical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'

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
  const { isCollapsed, setIsCollapsed } = useSidebar()

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm m-3 flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse Button */}
      <div className="p-4 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 pt-0">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const IconComponent = item.icon
            return (
              <li key={item.name}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    'w-full space-x-3',
                    isCollapsed ? 'justify-center px-0' : 'justify-start',
                    isActive && 'bg-secondary text-secondary-foreground'
                  )}
                  asChild
                >
                  <Link to={item.href} title={isCollapsed ? item.name : undefined}>
                    <IconComponent className="w-4 h-4" />
                    {!isCollapsed && <span>{item.name}</span>}
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