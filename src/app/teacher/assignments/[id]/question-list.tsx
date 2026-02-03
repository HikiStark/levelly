'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Question } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface QuestionListProps {
  questions: Question[]
  assignmentId: string
}

export function QuestionList({ questions, assignmentId }: QuestionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    setDeleting(questionId)

    const { error } = await supabase
      .from('question')
      .delete()
      .eq('id', questionId)

    if (error) {
      alert('Error deleting question: ' + error.message)
    }

    setDeleting(null)
    router.refresh()
  }

  if (questions.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No questions yet. Add your first question above.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardContent className="py-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    Q{index + 1}
                  </span>
                  <Badge variant={question.type === 'mcq' ? 'default' : 'secondary'}>
                    {question.type === 'mcq' ? 'MCQ' : 'Open'}
                  </Badge>
                  <span className="text-sm text-gray-400">
                    {question.points} point{question.points !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-gray-900 mb-2">{question.prompt}</p>
                {question.type === 'mcq' && question.choices && (
                  <div className="space-y-1 ml-4">
                    {(() => {
                      const correctChoices = question.correct_choice?.split(',').map(c => c.trim()) || []
                      const isMultipleCorrect = correctChoices.length > 1
                      return (
                        <>
                          {isMultipleCorrect && (
                            <p className="text-xs text-blue-600 mb-1">
                              Multiple correct answers (select all)
                            </p>
                          )}
                          {(question.choices as { id: string; text: string }[]).map((choice) => {
                            const isCorrect = correctChoices.includes(choice.id)
                            return (
                              <p
                                key={choice.id}
                                className={`text-sm ${
                                  isCorrect
                                    ? 'text-green-600 font-medium'
                                    : 'text-gray-600'
                                }`}
                              >
                                {choice.id.toUpperCase()}) {choice.text}
                                {isCorrect && ' ✓'}
                              </p>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                )}
                {question.type === 'open' && question.reference_answer && (
                  <p className="text-sm text-gray-500 mt-2">
                    <span className="font-medium">Reference:</span>{' '}
                    {question.reference_answer.substring(0, 100)}
                    {question.reference_answer.length > 100 && '...'}
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
