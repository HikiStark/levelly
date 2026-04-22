'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from '@/components/language-toggle'
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
  showResults: boolean
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
      likert_config: { scale: number; min_label?: string; max_label?: string; labels?: string[] } | null
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
  const t = useTranslations('results')
  const tq = useTranslations('quiz')
  const [attempt, setAttempt] = useState<AttemptData | null>(null)
  const [redirectInfo, setRedirectInfo] = useState<RedirectInfo | null>(null)
  const [feedbackSettings, setFeedbackSettings] = useState<FeedbackSettings>({
    showCorrectAnswers: true,
    showAiFeedback: true,
    showResults: true,
  })
  const [guidanceNote, setGuidanceNote] = useState<string | null>(null)
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
          showResults: true,
        })
        setGuidanceNote(data.guidanceNote || null)
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
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || t('notFound')}</p>
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

  if (!feedbackSettings.showResults) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-end">
            <LanguageToggle />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('submittedTitle')}</CardTitle>
              <CardDescription>{t('submittedDesc')}</CardDescription>
            </CardHeader>
            {(guidanceNote || (attempt.is_final && attempt.journey_id && hasNextSession)) && (
              <CardContent className="space-y-4">
                {guidanceNote && (
                  <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm font-medium text-blue-900 mb-1">{t('guidanceTitle')}</p>
                    <p className="text-sm text-blue-900 whitespace-pre-line">{guidanceNote}</p>
                  </div>
                )}
                {attempt.is_final && attempt.journey_id && hasNextSession && (
                  <Button className="w-full" size="lg" onClick={handleNextSession}>
                    {t('continueNext')}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-end">
          <LanguageToggle />
        </div>
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{t('title', { quizTitle: attempt.assignment?.title || 'Quiz' })}</CardTitle>
            <CardDescription>
              {attempt.is_final ? t('resultsReady') : t('gradingInProgress')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!attempt.is_final && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-md flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                <span className="text-yellow-800">
                  {t('aiGrading')}
                </span>
              </div>
            )}

            {/* Session info */}
            {attempt.session && (
              <div className="mb-4 text-sm text-gray-600">
                {t('session', { title: attempt.session.title })}
                {totalSessions > 0 && (
                  <span className="ml-2 text-gray-400">
                    {t('sessionOf', { current: Math.min(currentIndex + 1, totalSessions), total: totalSessions })}
                  </span>
                )}
              </div>
            )}

            {/* Level Badge */}
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-2">{t('yourLevel')}</p>
              <Badge
                className={`text-xl px-6 py-2 ${getLevelColor(attempt.level as Level)} text-white`}
              >
                {getLevelDisplayName(attempt.level as Level)}
              </Badge>
              {!attempt.is_final && (
                <p className="text-xs text-gray-400 mt-2">{t('provisional')}</p>
              )}
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-4 bg-gray-50 rounded-md">
                <p className="text-3xl font-bold text-gray-900">{percentage}%</p>
                <p className="text-sm text-gray-500">{t('overallScore')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-md">
                <p className="text-3xl font-bold text-gray-900">
                  {attempt.total_score}/{attempt.max_score}
                </p>
                <p className="text-sm text-gray-500">{t('points')}</p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="mt-6 space-y-2">
              {attempt.mcq_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('multipleChoice')}</span>
                  <span className="font-medium">
                    {attempt.mcq_score}/{attempt.mcq_total}
                  </span>
                </div>
              )}
              {attempt.open_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('openEnded')}</span>
                  <span className="font-medium">
                    {attempt.is_final
                      ? `${attempt.open_score}/${attempt.open_total}`
                      : t('grading')}
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
                    {t('openLearningContent')}
                  </Button>
                ) : redirectInfo.type === 'embed' && redirectInfo.embedCode ? (
                  <div className="border rounded-lg p-4 bg-white">
                    <EmbedRenderer htmlContent={redirectInfo.embedCode} />
                  </div>
                ) : null}
              </div>
            )}

            {/* Teacher guidance note */}
            {attempt.is_final && guidanceNote && (
              <div className="mt-6 rounded-md bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">{t('guidanceTitle')}</p>
                <p className="text-sm text-blue-900 whitespace-pre-line">{guidanceNote}</p>
              </div>
            )}

            {/* Next Session / Overall Results */}
            {attempt.is_final && attempt.journey_id && journeyInfo && (
              <div className="mt-6">
                {hasNextSession ? (
                  <Button className="w-full" size="lg" onClick={handleNextSession}>
                    {t('continueNextSession')}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => router.push(`/results/journey/${attempt.journey_id}`)}
                  >
                    {t('viewOverallResults')}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Results — hidden when teacher disables show_results */}
        {feedbackSettings.showResults && attempt.is_final && attempt.answer && attempt.answer.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('questionDetails')}</CardTitle>
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
                      alt={tq('questionImageAlt')}
                      className="max-w-full h-auto rounded-lg mb-2"
                    />
                  )}

                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm">
                      Q{index + 1}: {ans.question?.prompt}
                    </p>
                    {ans.question?.has_correct_answer === false ? (
                      <Badge variant="secondary">{t('ungraded')}</Badge>
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
                      {t('yourAnswer', { answer: ans.selected_choice?.toUpperCase() || t('notAnswered') })}
                      {ans.question?.has_correct_answer !== false && ans.is_correct !== null &&
                        (ans.is_correct ? ` ${t('correct')}` : ` ${t('incorrect')}`)}
                    </p>
                  )}

                  {/* Slider Answer */}
                  {ans.question?.type === 'slider' && (
                    <div className="text-sm text-gray-600">
                      <p>
                        {t('yourAnswer', { answer: ans.slider_value ?? t('notAnswered') })}
                        {ans.question?.has_correct_answer !== false && ans.is_correct !== null &&
                          (ans.is_correct ? ` ${t('correct')}` : ` ${t('incorrect')}`)}
                      </p>
                      {feedbackSettings.showCorrectAnswers && ans.question.has_correct_answer !== false && ans.question.slider_config && (
                        <p className="text-xs text-gray-400">
                          {t('correctValue', { value: ans.question.slider_config.correct_value })}
                          {ans.question.slider_config.tolerance > 0 &&
                            ` ${t('toleranceDisplay', { tolerance: ans.question.slider_config.tolerance })}`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Image Map Answer */}
                  {ans.question?.type === 'image_map' && ans.question.image_map_config && (
                    <div className="space-y-2">
                      <img
                        src={ans.question.image_map_config.base_image_url}
                        alt={tq('questionImageAlt')}
                        className="max-w-full h-auto rounded-lg"
                      />
                      <div className="text-sm text-gray-600 space-y-1">
                        {ans.question.image_map_config.flags.map((flag) => (
                          <div key={flag.id} className="flex justify-between">
                            <span>{flag.label}:</span>
                            <span>
                              {ans.image_map_answers?.[flag.id] || t('notAnswered')}
                            </span>
                          </div>
                        ))}
                      </div>
                      {ans.ai_feedback && feedbackSettings.showAiFeedback && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded whitespace-pre-line">
                          {t('feedback', { text: ans.ai_feedback })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Likert Answer */}
                  {ans.question?.type === 'likert' && ans.question.likert_config && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        {t('yourAnswer', { answer: ans.slider_value != null
                          ? `${ans.slider_value} / ${ans.question.likert_config.scale}`
                          : t('notAnswered') })}
                      </p>
                      {ans.slider_value != null && (
                        <p className="text-xs text-gray-400">
                          {ans.question.likert_config.min_label} — {ans.question.likert_config.max_label}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Open Answer */}
                  {ans.question?.type === 'open' && (
                    <>
                      <p className="text-sm text-gray-600">
                        {t('yourAnswer', { answer: ans.answer_text || t('notAnswered') })}
                      </p>
                      {ans.ai_feedback && feedbackSettings.showAiFeedback && (
                        <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          {t('feedback', { text: ans.ai_feedback })}
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
