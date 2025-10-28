import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus } from 'lucide-react'

export function Vocabulary() {
  const words = [
    { word: 'Hola', definition: 'Hello', mastery: 50 },
    { word: 'Gracias', definition: 'Thank you', mastery: 75 },
    { word: 'Por favor', definition: 'Please', mastery: 25 },
    { word: 'De nada', definition: "You're welcome", mastery: 100 },
    { word: 'Si', definition: 'Yes', mastery: 60 },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vocabulary</h1>
          <p className="text-muted-foreground">Learn Spanish</p>
        </div>
        <Button className="text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add New Word
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search vocabulary"
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button size="sm" className="text-white">All</Button>
          <Button variant="outline" size="sm">Mastered</Button>
          <Button variant="outline" size="sm">Learning</Button>
        </div>
      </div>

      {/* Vocabulary Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Word</TableHead>
              <TableHead>Definition</TableHead>
              <TableHead>Mastery</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map((word) => (
              <TableRow key={word.word}>
                <TableCell className="font-medium">
                  {word.word}
                </TableCell>
                <TableCell>{word.definition}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="flex-1 bg-muted rounded-full h-2 mr-3">
                      <div
                        className={`h-2 rounded-full ${
                          word.mastery === 100 ? 'bg-green-500' :
                          word.mastery >= 75 ? 'bg-blue-500' :
                          word.mastery >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${word.mastery}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{word.mastery}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="link" size="sm" className="text-blue-600">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}