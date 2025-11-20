import { Settings, Mic, Globe, Shield, Code, Info, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SettingsSection = 'general' | 'audio' | 'transcription' | 'language' | 'privacy' | 'developer' | 'about'

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

const sections = [
  { id: 'general' as const, name: 'General', icon: Settings },
  { id: 'audio' as const, name: 'Audio', icon: Mic },
  { id: 'transcription' as const, name: 'Transcription', icon: FileText },
  { id: 'language' as const, name: 'Language', icon: Globe },
  { id: 'privacy' as const, name: 'Privacy', icon: Shield },
  { id: 'developer' as const, name: 'Developer', icon: Code },
  { id: 'about' as const, name: 'About', icon: Info },
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-48 border-r border-border bg-muted/30 p-3 space-y-1">
      {sections.map((section) => {
        const Icon = section.icon
        const isActive = activeSection === section.id

        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              'hover:bg-accent/50',
              isActive
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{section.name}</span>
          </button>
        )
      })}
    </div>
  )
}
