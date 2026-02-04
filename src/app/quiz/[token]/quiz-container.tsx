'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Question } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MCQQuestion } from './mcq-question'
import { OpenQuestion } from './open-question'
import { SliderQuestion } from './slider-question'
import { ImageMapQuestion } from './image-map-question'

interface QuizContainerProps {
  assignment: {
    id: string
    title: string
    description: string | null
  }
  questions: Question[]
  shareLinkId: string
}

interface AnswerState {
  [questionId: string]: {
    selectedChoice?: string
    answerText?: string
    sliderValue?: number
    imageMapAnswers?: Record<string, string>
  }
}

export function QuizContainer({ assignment, questions, shareLinkId }: QuizContainerProps) {
  const [started, setStarted] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [answers, setAnswers] = useState<AnswerState>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleMCQSelect = (questionId: string, choiceId: string) => {
    setAnswers({
      ...answers,
      [questionId]: { ...answers[questionId], selectedChoice: choiceId },
    })
  }

  const handleOpenChange = (questionId: string, text: string) => {
    setAnswers({
      ...answers,
      [questionId]: { ...answers[questionId], answerText: text },
    })
  }

  const handleSliderChange = (questionId: string, value: number) => {
    setAnswers({
      ...answers,
      [questionId]: { ...answers[questionId], sliderValue: value },
    })
  }

  const handleImageMapChange = (questionId: string, flagId: string, answer: string) => {
    const currentImageMapAnswers = answers[questionId]?.imageMapAnswers || {}
    setAnswers({
      ...answers,
      [questionId]: {
        ...answers[questionId],
        imageMapAnswers: { ...currentImageMapAnswers, [flagId]: answer },
      },
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          shareLinkId,
          studentName: studentName || null,
          studentEmail: studentEmail || null,
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            selectedChoice: answer.selectedChoice || null,
            answerText: answer.answerText || null,
            sliderValue: answer.sliderValue ?? null,
            imageMapAnswers: answer.imageMapAnswers || null,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit quiz')
      }

      router.push(`/results/${data.attemptId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
      setSubmitting(false)
    }
  }

  const isAnswered = (answer: AnswerState[string] | undefined) => {
    if (!answer) return false
    if (answer.selectedChoice) return true
    if (answer.answerText) return true
    if (answer.sliderValue !== undefined) return true
    if (answer.imageMapAnswers && Object.keys(answer.imageMapAnswers).length > 0) return true
    return false
  }

  const answeredCount = Object.keys(answers).filter((qId) => isAnswered(answers[qId])).length

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{assignment.title}</CardTitle>
              {assignment.description && (
                <CardDescription>{assignment.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                This quiz has {questions.length} question{questions.length !== 1 ? 's' : ''}.
              </p>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={() => setStarted(true)} className="w-full mt-6">
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-gray-600 mt-1">
            {answeredCount} of {questions.length} answered
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({question.points} point{question.points !== 1 ? 's' : ''})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Show question image if present (for mcq, open, slider) */}
                {question.image_url && question.type !== 'image_map' && (
                  <div className="mb-4">
                    <img
                      src={question.image_url}
                      alt="Question image"
                      className="max-w-full h-auto rounded-lg"
                    />
                  </div>
                )}

                {question.type === 'mcq' && (
                  <MCQQuestion
                    question={question}
                    selectedChoice={answers[question.id]?.selectedChoice}
                    onSelect={(choiceId) => handleMCQSelect(question.id, choiceId)}
                  />
                )}

                {question.type === 'open' && (
                  <OpenQuestion
                    question={question}
                    answer={answers[question.id]?.answerText || ''}
                    onChange={(text) => handleOpenChange(question.id, text)}
                  />
                )}

                {question.type === 'slider' && (
                  <SliderQuestion
                    question={question}
                    value={answers[question.id]?.sliderValue}
                    onChange={(value) => handleSliderChange(question.id, value)}
                  />
                )}

                {question.type === 'image_map' && (
                  <ImageMapQuestion
                    question={question}
                    answers={answers[question.id]?.imageMapAnswers || {}}
                    onAnswerChange={(flagId, answer) =>
                      handleImageMapChange(question.id, flagId, answer)
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </div>
    </div>
  )
}
