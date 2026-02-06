'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Question, SliderConfig, ImageMapConfig, Session } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin } from 'lucide-react'
import { EditQuestionDialog } from './edit-question-dialog'

interface QuestionListProps {
  questions: Question[]
  assignmentId: string
  selectedSessionId: string | null | 'all'
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'mcq':
      return { label: 'MCQ', variant: 'default' as const }
    case 'open':
      return { label: 'Open', variant: 'secondary' as const }
    case 'slider':
      return { label: 'Slider', variant: 'outline' as const }
    case 'image_map':
      return { label: 'Image Map', variant: 'outline' as const }
    default:
      return { label: type, variant: 'secondary' as const }
  }
}

export function QuestionList({ questions, assignmentId, selectedSessionId }: QuestionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('questions')
  const tc = useTranslations('common')

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(`/api/sessions?assignmentId=${assignmentId}`)
        const data = await response.json()
        if (response.ok) {
          setSessions(data.sessions || [])
        }
      } catch {
        setSessions([])
      }
    }
    fetchSessions()
  }, [assignmentId, questions.length])

  const getSessionLabel = (sessionId: string | null) => {
    if (!sessionId) return t('unassigned')
    const session = sessions.find(s => s.id === sessionId)
    return session?.title || t('session')
  }

  const filteredQuestions = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.order_index - b.order_index)
    if (selectedSessionId === 'all') return sorted
    if (selectedSessionId === null) return sorted.filter(q => !q.session_id)
    return sorted.filter(q => q.session_id === selectedSessionId)
  }, [questions, selectedSessionId])

  const getNextOrderIndex = (sessionId: string | null, currentQuestionId: string) => {
    const list = questions.filter(
      q => q.id !== currentQuestionId && (q.session_id || null) === sessionId
    )
    const maxIndex = list.reduce((max, q) => Math.max(max, q.order_index), -1)
    return maxIndex + 1
  }

  const handleSessionChange = async (question: Question, newSessionId: string | null) => {
    if ((question.session_id || null) === newSessionId) return
    const nextOrderIndex = getNextOrderIndex(newSessionId, question.id)
    const { error } = await supabase
      .from('question')
      .update({ session_id: newSessionId, order_index: nextOrderIndex })
      .eq('id', question.id)

    if (error) {
      alert(`${t('errorUpdating')}: ${error.message}`)
      return
    }

    router.refresh()
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm(t('deleteConfirm'))) return

    setDeleting(questionId)

    const { error } = await supabase
      .from('question')
      .delete()
      .eq('id', questionId)

    if (error) {
      alert(`${t('errorDeleting')}: ${error.message}`)
    }

    setDeleting(null)
    router.refresh()
  }

  if (filteredQuestions.length === 0) {
    return (
        <p className="text-gray-500 text-center py-8">
          {t('noQuestionsInSession')}
        </p>
    )
  }

  return (
    <div className="space-y-4">
      {filteredQuestions.map((question, index) => {
        const typeBadge = getTypeBadge(question.type)
        const sliderConfig = question.slider_config as SliderConfig | null
        const imageMapConfig = question.image_map_config as ImageMapConfig | null

        return (
          <Card key={question.id}>
            <CardContent className="py-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                    <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                      <span className="text-sm text-gray-400">
                        {t('point', { count: question.points })}
                      </span>
                    {question.has_correct_answer === false && (
                      <Badge variant="secondary">{t('ungraded')}</Badge>
                    )}
                    <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                      {getSessionLabel(question.session_id)}
                    </span>
                    {sessions.length > 0 && (
                      <select
                        value={question.session_id || ''}
                        onChange={(e) => handleSessionChange(question, e.target.value || null)}
                        className="ml-2 border border-gray-300 rounded-md px-2 py-1 text-xs"
                      >
                        <option value="">{t('unassigned')}</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {question.image_url && question.type !== 'image_map' && (
                    <img
                      src={question.image_url}
                      alt={t('questionImageAlt')}
                      className="max-w-xs h-auto rounded-lg mb-2"
                    />
                  )}

                  <p className="text-gray-900 mb-2">{question.prompt}</p>

                  {question.type === 'mcq' && question.choices && (
                    <div className="space-y-1 ml-4">
                      {(question.choices as { id: string; text: string }[]).map((choice) => {
                        const correctChoices = question.correct_choice?.split(',').map(c => c.trim()) || []
                        const isCorrect = correctChoices.includes(choice.id)
                        return (
                          <p
                            key={choice.id}
                            className={`text-sm ${isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}`}
                          >
                            {choice.id.toUpperCase()}) {choice.text}
                            {isCorrect ? ` ${t('correct')}` : ''}
                          </p>
                        )
                      })}
                    </div>
                  )}

                  {question.type === 'open' && question.reference_answer && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">{t('referenceAnswerShort')}:</span>{' '}
                      {question.reference_answer.substring(0, 100)}
                      {question.reference_answer.length > 100 ? '...' : ''}
                    </p>
                  )}

                  {question.type === 'slider' && sliderConfig && (
                    <div className="text-sm text-gray-500 mt-2 space-y-1">
                      <p>
                        {t('range', { min: sliderConfig.min, max: sliderConfig.max, step: sliderConfig.step })}
                      </p>
                      {question.has_correct_answer !== false && (
                        <p>
                          {t('correctWithTolerance', { value: sliderConfig.correct_value, tolerance: sliderConfig.tolerance })}
                        </p>
                      )}
                    </div>
                  )}

                  {question.type === 'image_map' && imageMapConfig && (
                    <div className="mt-2">
                      <div className="relative inline-block">
                        <img
                          src={imageMapConfig.base_image_url}
                          alt={t('imageMapLabel')}
                          className="max-w-xs h-auto rounded-lg"
                        />
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {t('flags', { count: imageMapConfig.flags.length })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <EditQuestionDialog
                    question={question}
                    assignmentId={assignmentId}
                    questions={questions}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(question.id)}
                    disabled={deleting === question.id}
                  >
                    {deleting === question.id ? tc('loading') : tc('delete')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
