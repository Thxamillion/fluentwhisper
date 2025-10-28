import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Filter, Download, Trash2 } from 'lucide-react'

export function History() {
  const recordings = [
    { date: '2024-07-26', language: 'Spanish', topic: 'Travel', duration: '30 min' },
    { date: '2024-07-25', language: 'French', topic: 'Food', duration: '25 min' },
    { date: '2024-07-24', language: 'German', topic: 'Work', duration: '40 min' },
    { date: '2024-07-23', language: 'Italian', topic: 'Family', duration: '20 min' },
    { date: '2024-07-22', language: 'Japanese', topic: 'Hobbies', duration: '35 min' },
    { date: '2024-07-21', language: 'Chinese', topic: 'Culture', duration: '45 min' },
    { date: '2024-07-20', language: 'Russian', topic: 'Politics', duration: '50 min' },
    { date: '2024-07-19', language: 'Arabic', topic: 'Religion', duration: '15 min' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Recordings</h1>
          <p className="text-muted-foreground">Review and manage your past recording sessions.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete selected
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search recordings..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Recordings Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input type="checkbox" className="rounded" />
              </TableHead>
              <TableHead>Session Date ↓</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings.map((recording, index) => (
              <TableRow key={index}>
                <TableCell>
                  <input type="checkbox" className="rounded" />
                </TableCell>
                <TableCell className="font-medium">
                  {recording.date}
                </TableCell>
                <TableCell>{recording.language}</TableCell>
                <TableCell>{recording.topic}</TableCell>
                <TableCell>{recording.duration}</TableCell>
                <TableCell>
                  <Button variant="link" size="sm" className="text-blue-600">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-700">
          Showing 1 to 8 of 256 results
        </p>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600">
            ‹
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">2</button>
          <button className="p-2 text-gray-600 hover:text-gray-900">
            ›
          </button>
        </div>
      </div>
    </div>
  )
}