'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface QuestionnaireQuestion {
  id: string
  type: 'text' | 'rating' | 'mcq'
  prompt: string
  options: { id: string; text: string }[] | { min: number; max: number } | null
  is_required: boolean
  order_index: number
}

interface Questionnaire {
  id: string
  title: string
  description: string | null
  is_enabled: boolean
}

interface QuestionnaireFormProps {
  questionnaire: Questionnaire
  questions: QuestionnaireQuestion[]
  attemptId: string
  onSubmitted: () => void
}

export function QuestionnaireForm({
  questionnaire,
  questions,
  attemptId,
  onSubmitted,
}: QuestionnaireFormProps) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required questions
    for (const q of questions) {
      if (q.is_required && !answers[q.id]) {
        setError(`Please answer: "${q.prompt}"`)
        return
      }
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/questionnaire/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionnaireId: questionnaire.id,
          attemptId,
          answers: Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit questionnaire')
      }

      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const updateAnswer = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{questionnaire.title}</CardTitle>
        {questionnaire.description && (
          <CardDescription>{questionnaire.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {questions
            .sort((a, b) => a.order_index - b.order_index)
            .map((question, index) => (
              <div key={question.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  {index + 1}. {question.prompt}
                  {question.is_required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {question.type === 'text' && (
                  <Textarea
                    placeholder="Your answer..."
                    value={(answers[question.id] as string) || ''}
                    onChange={(e) => updateAnswer(question.id, e.target.value)}
                    rows={3}
                  />
                )}

                {question.type === 'rating' && question.options && !Array.isArray(question.options) && (
                  <div className="flex gap-2 pt-2">
                    {Array.from(
                      { length: (question.options as { min: number; max: number }).max - (question.options as { min: number; max: number }).min + 1 },
                      (_, i) => (question.options as { min: number; max: number }).min + i
                    ).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateAnswer(question.id, value)}
                        className={`w-10 h-10 rounded-full border-2 text-sm font-medium transition-colors ${
                          answers[question.id] === value
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}

                {question.type === 'mcq' && question.options && Array.isArray(question.options) && (
                  <RadioGroup
                    value={(answers[question.id] as string) || ''}
                    onValueChange={(value) => updateAnswer(question.id, value)}
                    className="space-y-2 pt-2"
                  >
                    {(question.options as { id: string; text: string }[]).map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                        <Label htmlFor={`${question.id}-${option.id}`} className="cursor-pointer font-normal">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
