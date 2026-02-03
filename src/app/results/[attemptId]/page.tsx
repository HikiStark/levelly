'use client'

import { useEffect, useState, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLevelDisplayName, getLevelColor, Level } from '@/lib/grading/level-calculator'
import { QuestionnaireForm } from './questionnaire-form'

interface QuestionnaireData {
  id: string
  title: string
  description: string | null
  is_enabled: boolean
}

interface QuestionnaireQuestionData {
  id: string
  type: 'text' | 'rating' | 'mcq'
  prompt: string
  options: { id: string; text: string }[] | { min: number; max: number } | null
  is_required: boolean
  order_index: number
}

interface AttemptData {
  id: string
  assignment_id: string
  status: string
  mcq_score: number
  mcq_total: number
  open_score: number
  open_total: number
  total_score: number
  max_score: number
  level: string
  is_final: boolean
  grading_progress: number | null
  grading_total: number | null
  assignment: {
    title: string
  }
  answer: {
    id: string
    question_id: string
    selected_choice: string | null
    answer_text: string | null
    is_correct: boolean | null
    score: number | null
    ai_feedback: string | null
    question: {
      prompt: string
      type: string
      points: number
      order_index: number
    }
  }[]
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = use(params)
  const [attempt, setAttempt] = useState<AttemptData | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null)
  const [questionnaireQuestions, setQuestionnaireQuestions] = useState<QuestionnaireQuestionData[]>([])
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const fetchAttempt = async () => {
      try {
        const response = await fetch(`/api/attempts/${attemptId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch results')
        }

        setAttempt(data.attempt)
        setRedirectUrl(data.redirectUrl)
        setQuestionnaire(data.questionnaire)
        setQuestionnaireQuestions(data.questionnaireQuestions || [])
        setQuestionnaireSubmitted(data.questionnaireSubmitted)
        setLoading(false)

        // Stop polling if final
        if (data.attempt.is_final && intervalId) {
          clearInterval(intervalId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results')
        setLoading(false)
        if (intervalId) {
          clearInterval(intervalId)
        }
      }
    }

    // Initial fetch
    fetchAttempt()

    // Poll every 2 seconds until final
    intervalId = setInterval(fetchAttempt, 2000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [attemptId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Results not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const percentage = attempt.max_score > 0
    ? Math.round((attempt.total_score / attempt.max_score) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{attempt.assignment?.title || 'Quiz'} Results</CardTitle>
            <CardDescription>
              {attempt.is_final
                ? 'Your final results are ready!'
                : 'Grading in progress...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!attempt.is_final && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-md flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                <span className="text-yellow-800">
                  AI is grading your open-ended answers...
                </span>
              </div>
            )}

            {/* Level Badge */}
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-2">Your Level</p>
              <Badge
                className={`text-xl px-6 py-2 ${getLevelColor(attempt.level as Level)} text-white`}
              >
                {getLevelDisplayName(attempt.level as Level)}
              </Badge>
              {!attempt.is_final && (
                <p className="text-xs text-gray-400 mt-2">(Provisional)</p>
              )}
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-4 bg-gray-50 rounded-md">
                <p className="text-3xl font-bold text-gray-900">{percentage}%</p>
                <p className="text-sm text-gray-500">Overall Score</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-md">
                <p className="text-3xl font-bold text-gray-900">
                  {attempt.total_score}/{attempt.max_score}
                </p>
                <p className="text-sm text-gray-500">Points</p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="mt-6 space-y-2">
              {attempt.mcq_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Multiple Choice</span>
                  <span className="font-medium">
                    {attempt.mcq_score}/{attempt.mcq_total}
                  </span>
                </div>
              )}
              {attempt.open_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Open-ended</span>
                  <span className="font-medium">
                    {attempt.is_final
                      ? `${attempt.open_score}/${attempt.open_total}`
                      : 'Grading...'}
                  </span>
                </div>
              )}
            </div>

            {/* Redirect Button */}
            {attempt.is_final && redirectUrl && (
              <div className="mt-8">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => window.open(redirectUrl, '_blank')}
                >
                  Continue to Next Step
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Results */}
        {attempt.is_final && attempt.answer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Question Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...attempt.answer]
                .sort((a, b) => (a.question?.order_index ?? 0) - (b.question?.order_index ?? 0))
                .map((ans, index) => (
                <div
                  key={ans.id}
                  className="p-4 border rounded-md space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm">
                      Q{index + 1}: {ans.question?.prompt}
                    </p>
                    <Badge
                      variant={
                        ans.score === ans.question?.points
                          ? 'default'
                          : ans.score && ans.score > 0
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {ans.score ?? 0}/{ans.question?.points}
                    </Badge>
                  </div>
                  {ans.question?.type === 'mcq' ? (
                    <p className="text-sm text-gray-600">
                      Your answer: {ans.selected_choice?.toUpperCase() || 'Not answered'}
                      {ans.is_correct ? ' ✓' : ' ✗'}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Your answer: {ans.answer_text || 'Not answered'}
                      </p>
                      {ans.ai_feedback && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          Feedback: {ans.ai_feedback}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Questionnaire */}
        {attempt.is_final && questionnaire && questionnaireQuestions.length > 0 && !questionnaireSubmitted && (
          <QuestionnaireForm
            questionnaire={questionnaire}
            questions={questionnaireQuestions}
            attemptId={attemptId}
            onSubmitted={() => setQuestionnaireSubmitted(true)}
          />
        )}

        {/* Thank you message after questionnaire submission */}
        {attempt.is_final && questionnaireSubmitted && (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-green-600 font-medium">Thank you for your feedback!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
