import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mic } from 'lucide-react'
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
  const [selectedLanguage, setSelectedLanguage] = useState('es')
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <AuthModalContext.Provider value={{ openAuthModal: () => setShowAuthModal(true) }}>
      <SidebarProvider>
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

        <div className="flex h-screen bg-background">
          {/* macOS Draggable Titlebar */}
          <div className="titlebar" />

          <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header - Floating */}
        <header className="absolute top-0 left-0 right-0 z-10 px-6 py-4 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-4">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                </SelectContent>
              </Select>
              <Button className="shadow-md">
                <Mic className="w-4 h-4 mr-2" />
                Record
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content - Extends behind header */}
        <main className="flex-1 overflow-auto pt-20">
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