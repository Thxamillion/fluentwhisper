import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/dashboard/Dashboard'
import { Record } from '@/pages/record/Record'
import { Library } from '@/pages/library/Library'
import { History } from '@/pages/history/History'
import { SessionDetail } from '@/pages/session-detail/SessionDetail'
import { Vocabulary } from '@/pages/vocabulary/Vocabulary'
import { Analytics } from '@/pages/analytics/Analytics'
import { Settings } from '@/pages/settings/Settings'
import { Import } from '@/pages/import/Import'
import { Test } from '@/pages/test/Test'
import { ReadAloud } from '@/pages/read-aloud/ReadAloud'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="record" element={<Record />} />
            <Route path="library" element={<Library />} />
            <Route path="read-aloud/:textLibraryId" element={<ReadAloud />} />
            <Route path="history" element={<History />} />
            <Route path="session/:sessionId" element={<SessionDetail />} />
            <Route path="vocabulary" element={<Vocabulary />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="import" element={<Import />} />
            <Route path="test" element={<Test />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App