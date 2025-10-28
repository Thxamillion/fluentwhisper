import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mic } from 'lucide-react'
import { FirstRunCheck } from '../FirstRunCheck'

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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