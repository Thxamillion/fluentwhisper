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
  LogOut,
  User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/hooks/auth'
import { useSubscription } from '@/hooks/subscription'
import { useAuthModal } from './Layout'

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
  const { user, signOut } = useAuth()
  const { data: subscription } = useSubscription()
  const { openAuthModal } = useAuthModal()

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

      {/* Theme Toggle */}
      <div className="px-4 pb-4">
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-start"
        )}>
          <ThemeToggle />
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-800">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                >
                  <User className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2 py-1 h-auto hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {subscription?.isPremium ? 'Premium' : 'Free'}
                      </p>
                    </div>
                  </div>
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={openAuthModal}
            className={cn(
              "w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
              isCollapsed ? "px-0" : "justify-start"
            )}
          >
            <User className="w-4 h-4" />
            {!isCollapsed && <span className="ml-2">Sign In</span>}
          </Button>
        )}
      </div>
    </div>
  )
}