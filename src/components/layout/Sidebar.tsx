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
  ChevronRight,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSidebar } from '@/contexts/SidebarContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Record', href: '/record', icon: Mic },
  { name: 'Library', href: '/library', icon: BookOpen },
  { name: 'History', href: '/history', icon: History },
  { name: 'Vocabulary', href: '/vocabulary', icon: BookText },
  { name: 'Progress', href: '/progress', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Test Langpack', href: '/test', icon: FlaskConical },
]

export function Sidebar() {
  const location = useLocation()
  const { isCollapsed, setIsCollapsed } = useSidebar()

  return (
    <div
      className={cn(
        "rounded-xl shadow-sm m-3 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      style={{ backgroundColor: 'hsl(var(--sidebar-bg))' }}
    >
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
                <Link
                  to={item.href}
                  className={cn(
                    'group flex items-center rounded-md p-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                    isCollapsed ? 'justify-center' : ''
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <IconComponent
                    className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400',
                      !isCollapsed && 'mr-3'
                    )}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-start"
        )}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
