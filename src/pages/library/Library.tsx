import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Bell, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Library() {
  const navigate = useNavigate()

  const books = [
    {
      title: 'The Secret Garden',
      author: 'Frances Hodgson Burnett',
      cover: '🌿',
    },
    {
      title: 'The Little Prince',
      author: 'Antoine de Saint-Exupéry',
      cover: '👑',
    },
    {
      title: 'Don Quixote',
      author: 'Miguel de Cervantes',
      cover: '🏰',
    },
    {
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      cover: '💕',
    },
    {
      title: 'Crime and Punishment',
      author: 'Fyodor Dostoevsky',
      cover: '⚖️',
    },
    {
      title: 'One Hundred Years of Solitude',
      author: 'Gabriel García Márquez',
      cover: '🏠',
    },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Library</h1>
          <p className="text-muted-foreground">Explore and manage your practice materials.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search library..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Bell className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {['All', 'In Progress', 'Completed', 'Favorites'].map((category) => (
            <Button
              key={category}
              variant={category === 'All' ? 'default' : 'outline'}
              size="sm"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {books.map((book) => (
          <Card key={book.title} className="hover:shadow-md transition-shadow cursor-pointer group">
            <div className="aspect-[3/4] bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-lg flex items-center justify-center text-6xl">
              {book.cover}
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground">{book.author}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Import Content Button */}
      <div className="flex justify-center">
        <Button onClick={() => navigate('/import')} className="text-white">
          <Plus className="w-4 h-4 mr-2" />
          Import Content
        </Button>
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-8">
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600">
            ‹
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">2</button>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">3</button>
          <span className="text-gray-400">...</span>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900">10</button>
          <button className="p-2 text-gray-600 hover:text-gray-900">
            ›
          </button>
        </div>
      </div>
    </div>
  )
}