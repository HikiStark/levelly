'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Question, Session } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MCQQuestion } from './mcq-question'
import { OpenQuestion } from './open-question'
import { SliderQuestion } from './slider-question'
import { ImageMapQuestion } from './image-map-question'
import { SessionProgressBar } from '@/components/session-progress-bar'
import { SessionMap } from '@/components/session-map'
import { Checkbox } from '@/components/ui/checkbox'
import { LanguageToggle } from '@/components/language-toggle'

interface QuizContainerProps {
  assignment: {
    id: string
    title: string
    description: string | null
  }
  shareLinkId: string
  token: string
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

interface AnswerState {
  [questionId: string]: {
    selectedChoice?: string
    answerText?: string
    sliderValue?: number
    imageMapAnswers?: Record<string, string>
  }
}

export function QuizContainer({ assignment, shareLinkId, token }: QuizContainerProps) {
  const t = useTranslations('quiz')
  const [started, setStarted] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [answers, setAnswers] = useState<AnswerState>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0)
  const [journeyCompleted, setJourneyCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const urlJourneyId = useMemo(() => searchParams.get('journeyId'), [searchParams])

  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      setError(null)
      try {
        let fetchedSessions: Session[] = []

        const sessionsResponse = await fetch(`/api/sessions?assignmentId=${assignment.id}`)
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json()
          fetchedSessions = sessionsData.sessions || []
        }

        if (urlJourneyId) {
          const journeyResponse = await fetch(`/api/journey/${urlJourneyId}`)
          const journeyData = await journeyResponse.json()
          if (!journeyResponse.ok) {
            throw new Error(journeyData.error || 'Failed to load journey')
          }
          const payload = journeyData as JourneyStatusResponse
          setJourneyId(payload.journey.id)
          setCurrentSessionIndex(payload.journey.current_session_index)
          setSessions(payload.sessions || fetchedSessions)
          setCurrentSessionId(payload.currentSession?.id || null)
          setJourneyCompleted(payload.journey.overall_status === 'completed')
          setStarted(true)
        } else {
          setSessions(fetchedSessions)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz')
      } finally {
        setLoading(false)
      }
    }
    initialize()
  }, [assignment.id, urlJourneyId])

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!started) return
      setLoadingQuestions(true)
      setError(null)
      try {
        let query = supabase
          .from('question')
          .select('*')
          .eq('assignment_id', assignment.id)

        if (sessions.length > 0) {
          if (!currentSessionId) {
            setQuestions([])
            return
          }
          query = query.eq('session_id', currentSessionId)
        }

        const { data, error: questionsError } = await query.order('order_index', { ascending: true })
        if (questionsError) {
          throw new Error(questionsError.message)
        }
        setQuestions((data as Question[]) || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions')
      } finally {
        setLoadingQuestions(false)
      }
    }
    fetchQuestions()
  }, [assignment.id, currentSessionId, sessions.length, started])

  useEffect(() => {
    setAnswers({})
    setSubmitting(false)
  }, [currentSessionId])

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

  const handleStart = async () => {
    setError(null)
    if (sessions.length === 0) {
      setStarted(true)
      return
    }

    try {
      const response = await fetch('/api/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          shareLinkId,
          studentName: studentName || null,
          studentEmail: studentEmail || null,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start journey')
      }

      setJourneyId(data.journeyId)
      setSessions(data.sessions || sessions)
      setCurrentSessionId(data.firstSessionId)
      setCurrentSessionIndex(0)
      setStarted(true)
      if (data.journeyId) {
        router.replace(`/quiz/${token}?journeyId=${data.journeyId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start journey')
    }
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
          sessionId: currentSessionId,
          journeyId,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingQuiz')}</p>
        </div>
      </div>
    )
  }

  if (journeyCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{t('journeyComplete')}</CardTitle>
              <CardDescription>{t('journeyCompleteDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {journeyId && (
                <Button onClick={() => router.push(`/results/journey/${journeyId}`)}>
                  {t('viewOverallResults')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{assignment.title}</CardTitle>
              {assignment.description && (
                <CardDescription>{assignment.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}
              {sessions.length > 0 && (
                <SessionMap sessions={sessions} />
              )}
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('yourName')}</Label>
                  <Input
                    id="name"
                    placeholder={t('enterName')}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('yourEmail')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('enterEmail')}
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="student-consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                />
                <Label
                  htmlFor="student-consent"
                  className="text-sm text-gray-600 leading-relaxed cursor-pointer"
                >
                  {t('consent')}
                </Label>
              </div>
              <Button onClick={handleStart} className="w-full mt-6" disabled={!consentGiven}>
                {t('startQuiz')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingQuestions')}</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">{t('noQuestions')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        <div className="mb-8 space-y-4">
          {sessions.length > 0 && (
            <SessionProgressBar
              sessions={sessions}
              currentIndex={currentSessionIndex}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <p className="text-gray-600 mt-1">
              {t('answered', { answered: answeredCount, total: questions.length })}
            </p>
          </div>
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
                  {t('questionNumber', { number: index + 1 })}
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {t('pointsSuffix', { count: question.points })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Show question image if present (for mcq, open, slider) */}
                {question.image_url && question.type !== 'image_map' && (
                  <div className="mb-4">
                    <img
                      src={question.image_url}
                      alt={t('questionImageAlt')}
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
            {submitting ? t('submitting') : t('submitQuiz')}
          </Button>
        </div>
      </div>
    </div>
  )
}
