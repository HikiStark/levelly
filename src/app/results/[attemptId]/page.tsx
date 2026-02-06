'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLevelDisplayName, getLevelColor, Level } from '@/lib/grading/level-calculator'
import { Session } from '@/lib/supabase/types'

interface RedirectInfo {
  type: 'link' | 'embed'
  url?: string
  embedCode?: string
}

interface FeedbackSettings {
  showCorrectAnswers: boolean
  showAiFeedback: boolean
}

interface AttemptData {
  id: string
  assignment_id: string
  session_id: string | null
  journey_id: string | null
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
  session: Session | null
  answer: {
    id: string
    question_id: string
    selected_choice: string | null
    answer_text: string | null
    slider_value: number | null
    image_map_answers: Record<string, string> | null
    is_correct: boolean | null
    score: number | null
    ai_feedback: string | null
    question: {
      prompt: string
      type: string
      points: number
      order_index: number
      has_correct_answer: boolean
      slider_config: { min: number; max: number; correct_value: number; tolerance: number } | null
      image_map_config: { base_image_url: string; flags: { id: string; label: string; answer_type: string; points: number }[] } | null
      image_url: string | null
    }
  }[]
}

interface JourneyStatusResponse {
  journey: {
    id: string
    current_session_index: number
    overall_status: 'in_progress' | 'completed'
  }
  sessions: Session[]
  currentSession: Session | null
  totalSessions: number
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = use(params)
  const [attempt, setAttempt] = useState<AttemptData | null>(null)
  const [redirectInfo, setRedirectInfo] = useState<RedirectInfo | null>(null)
  const [feedbackSettings, setFeedbackSettings] = useState<FeedbackSettings>({
    showCorrectAnswers: true,
    showAiFeedback: true,
  })
  const [shareLinkToken, setShareLinkToken] = useState<string | null>(null)
  const [journeyInfo, setJourneyInfo] = useState<JourneyStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    const initialNotFoundGraceMs = 15000
    const startedAt = Date.now()

    const fetchAttempt = async () => {
      try {
        const response = await fetch(`/api/attempts/${attemptId}`, { cache: 'no-store' })
        const data = await response.json()

        if (!response.ok) {
          if (
            response.status === 404 &&
            data.error === 'Attempt not found' &&
            Date.now() - startedAt < initialNotFoundGraceMs
          ) {
            return
          }
          throw new Error(data.error || 'Failed to fetch results')
        }

        setAttempt(data.attempt)
        setRedirectInfo(data.redirectInfo)
        setShareLinkToken(data.shareLinkToken || null)
        setFeedbackSettings(data.feedbackSettings || {
          showCorrectAnswers: true,
          showAiFeedback: true,
        })
        setLoading(false)

        if (data.attempt.journey_id) {
          const journeyResponse = await fetch(`/api/journey/${data.attempt.journey_id}`)
          const journeyData = await journeyResponse.json()
          if (journeyResponse.ok) {
            setJourneyInfo(journeyData)
          }
        }

        // Stop polling if final
        if (data.attempt.is_final && intervalId) {
          clearInterval(intervalId)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load results'
        const isTransientNotFound =
          message === 'Attempt not found' &&
          Date.now() - startedAt < initialNotFoundGraceMs

        if (isTransientNotFound) {
          return
        }

        setError(message)
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

  const handleNextSession = async () => {
    if (!attempt?.journey_id) return
    const response = await fetch(`/api/journey/${attempt.journey_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'advance' }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Failed to advance session')
      return
    }
    if (shareLinkToken) {
      router.push(`/quiz/${shareLinkToken}?journeyId=${attempt.journey_id}`)
    } else {
      router.refresh()
    }
  }

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

  const totalSessions = journeyInfo?.totalSessions ?? 0
  const currentIndex = journeyInfo?.journey.current_session_index ?? 0
  const hasNextSession = totalSessions > 0 && currentIndex < totalSessions - 1

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{attempt.assignment?.title || 'Quiz'} Results</CardTitle>
            <CardDescription>
              {attempt.is_final
                ? 'Your results are ready!'
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

            {/* Session info */}
            {attempt.session && (
              <div className="mb-4 text-sm text-gray-600">
                Session: <span className="font-medium">{attempt.session.title}</span>
                {totalSessions > 0 && (
                  <span className="ml-2 text-gray-400">
                    (Session {Math.min(currentIndex + 1, totalSessions)} of {totalSessions})
                  </span>
                )}
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

            {/* Redirect Content */}
            {attempt.is_final && redirectInfo && (
              <div className="mt-8 space-y-4">
                {redirectInfo.type === 'link' && redirectInfo.url ? (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => window.open(redirectInfo.url, '_blank')}
                  >
                    Open Learning Content
                  </Button>
                ) : redirectInfo.type === 'embed' && redirectInfo.embedCode ? (
                  <div className="border rounded-lg p-4 bg-white">
                    <EmbedRenderer htmlContent={redirectInfo.embedCode} />
                  </div>
                ) : null}
              </div>
            )}

            {/* Next Session / Overall Results */}
            {attempt.is_final && attempt.journey_id && journeyInfo && (
              <div className="mt-6">
                {hasNextSession ? (
                  <Button className="w-full" size="lg" onClick={handleNextSession}>
                    Continue to Next Session
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => router.push(`/results/journey/${attempt.journey_id}`)}
                  >
                    View Overall Results
                  </Button>
                )}
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
                  {/* Question Image (if present) */}
                  {ans.question?.image_url && ans.question?.type !== 'image_map' && (
                    <img
                      src={ans.question.image_url}
                      alt="Question image"
                      className="max-w-full h-auto rounded-lg mb-2"
                    />
                  )}

                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm">
                      Q{index + 1}: {ans.question?.prompt}
                    </p>
                    {ans.question?.has_correct_answer === false ? (
                      <Badge variant="secondary">Ungraded</Badge>
                    ) : (
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
                    )}
                  </div>

                  {/* MCQ Answer */}
                  {ans.question?.type === 'mcq' && (
                    <p className="text-sm text-gray-600">
                      Your answer: {ans.selected_choice?.toUpperCase() || 'Not answered'}
                      {ans.question?.has_correct_answer !== false && ans.is_correct !== null &&
                        (ans.is_correct ? ' (Correct)' : ' (Incorrect)')}
                    </p>
                  )}

                  {/* Slider Answer */}
                  {ans.question?.type === 'slider' && (
                    <div className="text-sm text-gray-600">
                      <p>
                        Your answer: {ans.slider_value ?? 'Not answered'}
                        {ans.question?.has_correct_answer !== false && ans.is_correct !== null &&
                          (ans.is_correct ? ' (Correct)' : ' (Incorrect)')}
                      </p>
                      {feedbackSettings.showCorrectAnswers && ans.question.has_correct_answer !== false && ans.question.slider_config && (
                        <p className="text-xs text-gray-400">
                          Correct: {ans.question.slider_config.correct_value}
                          {ans.question.slider_config.tolerance > 0 &&
                            ` (+/-${ans.question.slider_config.tolerance})`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Image Map Answer */}
                  {ans.question?.type === 'image_map' && ans.question.image_map_config && (
                    <div className="space-y-2">
                      <img
                        src={ans.question.image_map_config.base_image_url}
                        alt="Question image"
                        className="max-w-full h-auto rounded-lg"
                      />
                      <div className="text-sm text-gray-600 space-y-1">
                        {ans.question.image_map_config.flags.map((flag) => (
                          <div key={flag.id} className="flex justify-between">
                            <span>{flag.label}:</span>
                            <span>
                              {ans.image_map_answers?.[flag.id] || 'Not answered'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {ans.ai_feedback && feedbackSettings.showAiFeedback && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded whitespace-pre-line">
                          Feedback: {ans.ai_feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Open Answer */}
                  {ans.question?.type === 'open' && (
                    <>
                      <p className="text-sm text-gray-600">
                        Your answer: {ans.answer_text || 'Not answered'}
                      </p>
                      {ans.ai_feedback && feedbackSettings.showAiFeedback && (
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
      </div>
    </div>
  )
}

function EmbedRenderer({ htmlContent }: { htmlContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const temp = document.createElement('div')
    temp.innerHTML = htmlContent

    const scripts = temp.querySelectorAll('script')
    const fragment = document.createDocumentFragment()

    Array.from(temp.childNodes).forEach((node) => {
      if (node.nodeName !== 'SCRIPT') {
        fragment.appendChild(node.cloneNode(true))
      }
    })
    containerRef.current.appendChild(fragment)

    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script')
      if (oldScript.src) {
        newScript.src = oldScript.src
      } else {
        newScript.textContent = oldScript.textContent
      }
      Array.from(oldScript.attributes).forEach((attr) => {
        if (attr.name !== 'src') {
          newScript.setAttribute(attr.name, attr.value)
        }
      })
      containerRef.current?.appendChild(newScript)
    })
  }, [htmlContent])

  return (
    <div
      ref={containerRef}
      className="embed-container min-h-[200px]"
    />
  )
}
