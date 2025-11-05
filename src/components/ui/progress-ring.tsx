interface ProgressRingProps {
  progress: number // 0-100 (can exceed 100)
  size?: number // diameter in pixels
  strokeWidth?: number
  className?: string
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  className = ''
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  // Determine color and animation based on progress
  const getStrokeColor = () => {
    if (progress === 0) return 'stroke-gray-300 dark:stroke-gray-700'
    if (progress < 100) return 'stroke-blue-500 dark:stroke-blue-400'
    if (progress < 150) return 'stroke-green-500 dark:stroke-green-400 animate-pulse-subtle'
    return 'stroke-amber-500 dark:stroke-amber-400 animate-pulse-subtle'
  }

  return (
    <svg
      width={size}
      height={size}
      className={className}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-gray-800"
      />

      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`${getStrokeColor()} transition-all duration-500 ease-out`}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
        }}
      />
    </svg>
  )
}
