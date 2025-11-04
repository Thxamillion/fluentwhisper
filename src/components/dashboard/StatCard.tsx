import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtitle: string
  onClick?: () => void
  subtitleClassName?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  onClick,
  subtitleClassName = 'text-xs text-muted-foreground'
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
        <div className="text-2xl font-bold">{value}</div>
        <p className={subtitleClassName}>{subtitle}</p>
      </CardContent>
    </Card>
  )
}
