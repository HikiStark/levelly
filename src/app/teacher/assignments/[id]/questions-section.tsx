'use client'

import { useEffect, useMemo, useState } from 'react'
import { Question, Session } from '@/lib/supabase/types'
import { AddQuestionDialog } from './add-question-dialog'
import { ImageMapEditor } from './image-map-editor'
import { QuestionList } from './question-list'
import { Label } from '@/components/ui/label'

interface QuestionsSectionProps {
  assignmentId: string
  questions: Question[]
}

export function QuestionsSection({ assignmentId, questions }: QuestionsSectionProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionValue, setSelectedSessionValue] = useState<string>('all')

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

  const selectedSessionId = useMemo(() => {
    if (selectedSessionValue === 'all') return 'all' as const
    if (selectedSessionValue === 'unassigned') return null
    return selectedSessionValue
  }, [selectedSessionValue])

  const selectedLabel = useMemo(() => {
    if (selectedSessionValue === 'all') return 'All sessions'
    if (selectedSessionValue === 'unassigned') return 'Unassigned'
    const session = sessions.find(s => s.id === selectedSessionValue)
    return session?.title || 'Selected session'
  }, [selectedSessionValue, sessions])

  const selectedQuestionCount = useMemo(() => {
    if (selectedSessionId === 'all') return questions.length
    if (selectedSessionId === null) return questions.filter(q => !q.session_id).length
    return questions.filter(q => q.session_id === selectedSessionId).length
  }, [questions, selectedSessionId])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2 min-w-[260px]">
          <Label htmlFor="question-session-filter">Question Session</Label>
          <select
            id="question-session-filter"
            value={selectedSessionValue}
            onChange={(e) => setSelectedSessionValue(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All sessions</option>
            <option value="unassigned">Unassigned (legacy)</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <AddQuestionDialog
            assignmentId={assignmentId}
            questions={questions}
            initialSessionId={selectedSessionId === 'all' ? null : selectedSessionId}
          />
          <ImageMapEditor
            assignmentId={assignmentId}
            questions={questions}
            initialSessionId={selectedSessionId === 'all' ? null : selectedSessionId}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Showing {selectedQuestionCount} question{selectedQuestionCount !== 1 ? 's' : ''} in {selectedLabel}.
      </p>

      <QuestionList
        questions={questions}
        assignmentId={assignmentId}
        selectedSessionId={selectedSessionId}
      />
    </div>
  )
}
