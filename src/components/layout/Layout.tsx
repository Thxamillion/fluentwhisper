import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { FirstRunCheck } from '../FirstRunCheck'
import { useState, createContext, useContext } from 'react'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthModal } from '@/components/AuthModal'

type AuthModalContextType = {
  openAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextType | null>(null)

export const useAuthModal = () => {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within Layout')
  }
  return context
}

export function Layout() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <AuthModalContext.Provider value={{ openAuthModal: () => setShowAuthModal(true) }}>
      <SidebarProvider>
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

        <div className="flex h-screen bg-background">
          {/* macOS Draggable Titlebar */}
          <div className="titlebar" />

          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              {/* First Run Check Banner */}
              <FirstRunCheck />
              <Outlet />
            </main>
          </div>
    </div>
      </SidebarProvider>
    </AuthModalContext.Provider>
  )
}