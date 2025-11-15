import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, Loader2, Minus, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { VocabWordWithTranslation, LangCode } from '@/services/vocabulary/types'
import { useDeleteVocabWord, useToggleVocabMastered } from '@/hooks/vocabulary'
import { useSettingsStore } from '@/stores/settingsStore'

interface NewWordsProps {
  words: VocabWordWithTranslation[] | undefined
  isLoading: boolean
}

export function NewWords({ words, isLoading }: NewWordsProps) {
  const navigate = useNavigate()
  const language = useSettingsStore((state) => state.settings.targetLanguage)
  const deleteWord = useDeleteVocabWord()
  const toggleMastered = useToggleVocabMastered()

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
                className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
              >
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-sm font-medium truncate">{word.lemma}</span>
                  <span className="text-xs text-muted-foreground truncate ml-2">
                    {word.translation || 'No translation'}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteWord.mutate({ lemma: word.lemma, language: language as LangCode })}
                    disabled={deleteWord.isPending}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Delete word"
                  >
                    <Minus className="w-3 h-3 text-red-600 dark:text-red-400" />
                  </button>
                  <button
                    onClick={() => toggleMastered.mutate({ lemma: word.lemma, language: language as LangCode })}
                    disabled={toggleMastered.isPending}
                    className={`p-1 rounded transition-colors ${
                      word.mastered
                        ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
                        : 'hover:bg-green-100 dark:hover:bg-green-900/30'
                    }`}
                    title={word.mastered ? 'Mark as needs practice' : 'Mark as mastered'}
                  >
                    <Plus className={`w-3 h-3 ${word.mastered ? 'text-green-700 dark:text-green-300' : 'text-green-600 dark:text-green-400'}`} />
                  </button>
                </div>
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
