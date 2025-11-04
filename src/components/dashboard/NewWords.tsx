import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { VocabWordWithTranslation } from '@/services/vocabulary/types'

interface NewWordsProps {
  words: VocabWordWithTranslation[] | undefined
  isLoading: boolean
}

export function NewWords({ words, isLoading }: NewWordsProps) {
  const navigate = useNavigate()

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            New Words This Week
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => navigate('/vocabulary')}
          >
            View all
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col" style={{ height: 'calc(100% - 3.5rem)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : words && words.length > 0 ? (
          <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
            {words.map((word) => (
              <div
                key={word.id}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <span className="text-sm font-medium">{word.lemma}</span>
                <span className="text-xs text-muted-foreground">
                  {word.translation || 'No translation'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col justify-center">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No new words yet</p>
            <p className="text-xs mt-1">Start practicing to discover new vocabulary</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
