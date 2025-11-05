import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { ProgressRing } from '@/components/ui/progress-ring'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtitle: string
  onClick?: () => void
  subtitleClassName?: string
  // Progress ring props (optional)
  showProgressRing?: boolean
  progress?: number // 0-100 (can exceed 100)
  statusIcon?: LucideIcon // Optional icon to show based on state (checkmark, flame, etc)
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  onClick,
  subtitleClassName = 'text-xs text-muted-foreground',
  showProgressRing = false,
  progress = 0,
  statusIcon: StatusIcon
}: StatCardProps) {
  const isClickable = !!onClick

  return (
    <Card
      className={`border-gray-200 dark:border-gray-800 ${
        isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </div>

        {showProgressRing ? (
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <ProgressRing progress={progress} size={52} strokeWidth={4} />
              {StatusIcon && (
                <StatusIcon className="w-3.5 h-3.5 absolute top-0 right-0" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold">{value}</div>
              <p className={subtitleClassName}>{subtitle}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className={subtitleClassName}>{subtitle}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
