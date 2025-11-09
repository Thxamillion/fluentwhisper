import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { FirstRunCheck } from '../FirstRunCheck'
import { LanguagePackBanner } from '../LanguagePackBanner'
import { SidebarProvider } from '@/contexts/SidebarContext'

export function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        {/* macOS Draggable Titlebar */}
        <div className="titlebar" />

        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {/* First Run Check Banner - Whisper Model */}
            <FirstRunCheck />
            {/* Language Pack Banner */}
            <LanguagePackBanner />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
