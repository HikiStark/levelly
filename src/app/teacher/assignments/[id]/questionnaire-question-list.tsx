'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QuestionnaireQuestion } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface QuestionnaireQuestionListProps {
  questions: QuestionnaireQuestion[]
}

export function QuestionnaireQuestionList({ questions }: QuestionnaireQuestionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    setDeleting(questionId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('questionnaire_question')
      .delete()
      .eq('id', questionId)

    if (error) {
      alert('Error deleting question: ' + error.message)
    }

    setDeleting(null)
    router.refresh()
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text':
        return 'Text'
      case 'rating':
        return 'Rating'
      case 'mcq':
        return 'Choice'
      default:
        return type
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'text':
        return 'secondary' as const
      case 'rating':
        return 'default' as const
      case 'mcq':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  if (questions.length === 0) {
    return (
      <p className="text-gray-500 text-center py-4">
        No questions yet. Add your first question to get started.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardContent className="py-3">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-500">
                    Q{index + 1}
                  </span>
                  <Badge variant={getTypeBadgeVariant(question.type)}>
                    {getTypeLabel(question.type)}
                  </Badge>
                  {question.is_required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-gray-900">{question.prompt}</p>
                {question.type === 'mcq' && question.options && Array.isArray(question.options) && (
                  <div className="space-y-1 ml-4 mt-2">
                    {(question.options as { id: string; text: string }[]).map((option) => (
                      <p key={option.id} className="text-sm text-gray-600">
                        {option.id.toUpperCase()}) {option.text}
                      </p>
                    ))}
                  </div>
                )}
                {question.type === 'rating' && question.options && !Array.isArray(question.options) && (
                  <p className="text-sm text-gray-500 mt-1">
                    Scale: {(question.options as { min: number; max: number }).min} - {(question.options as { min: number; max: number }).max}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(question.id)}
                disabled={deleting === question.id}
              >
                {deleting === question.id ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
