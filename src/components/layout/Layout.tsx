import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mic } from 'lucide-react'
import { FirstRunCheck } from '../FirstRunCheck'
import { useState } from 'react'

export function Layout() {
  const [selectedLanguage, setSelectedLanguage] = useState('es');

  return (
    <div className="flex h-screen bg-background">
      {/* macOS Draggable Titlebar */}
      <div className="titlebar" />

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="px-6 py-4">
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

        {/* First Run Check Banner */}
        <FirstRunCheck />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}