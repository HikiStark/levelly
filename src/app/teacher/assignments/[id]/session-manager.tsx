'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Session, Question } from '@/lib/supabase/types'

interface SessionManagerProps {
  assignmentId: string
  questions: Question[]
}

interface SessionFormState {
  title: string
  description: string
  guidanceNote: string
}

export function SessionManager({ assignmentId, questions }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SessionFormState>({ title: '', description: '', guidanceNote: '' })
  const [editForm, setEditForm] = useState<SessionFormState>({ title: '', description: '', guidanceNote: '' })
  const router = useRouter()
  const t = useTranslations('sessions')
  const tc = useTranslations('common')

  const fetchSessions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/sessions?assignmentId=${assignmentId}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('failedToLoad'))
      }
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [assignmentId])

  const questionCountBySession = useMemo(() => {
    const counts = new Map<string | null, number>()
    for (const q of questions) {
      const key = q.session_id ?? null
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return counts
  }, [questions])

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError(t('titleRequired'))
      return
    }
    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          title: form.title.trim(),
          description: form.description.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t('failedToCreate'))
      }
      setForm({ title: '', description: '', guidanceNote: '' })
      await fetchSessions()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreate'))
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (session: Session) => {
    setEditingId(session.id)
    setEditForm({
      title: session.title,
      description: session.description || '',
      guidanceNote: session.guidance_note || '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: '', description: '', guidanceNote: '' })
  }

  const saveEdit = async (sessionId: string) => {
    if (!editForm.title.trim()) {
      setError(t('titleRequired'))
      return
    }
    setError(null)
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        guidanceNote: editForm.guidanceNote.trim() || null,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || t('failedToUpdate'))
      return
    }
    setEditingId(null)
    setEditForm({ title: '', description: '', guidanceNote: '' })
    await fetchSessions()
    router.refresh()
  }

  const saveGuidance = async (sessionId: string, note: string) => {
    setError(null)
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guidanceNote: note.trim() || null }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || t('failedToUpdate'))
      return false
    }
    await fetchSessions()
    router.refresh()
    return true
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm(t('deleteConfirm'))) return
    setError(null)
    const response = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || t('failedToDelete'))
      return
    }
    await fetchSessions()
    router.refresh()
  }

  const reorderSessions = async (newOrder: Session[]) => {
    setSessions(newOrder)
    const response = await fetch('/api/sessions/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId,
        sessionIds: newOrder.map(s => s.id),
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || t('failedToReorder'))
      await fetchSessions()
      return
    }
    setSessions(data.sessions || newOrder)
    router.refresh()
  }

  const moveSession = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= sessions.length) return
    const newOrder = [...sessions]
    const [moved] = newOrder.splice(index, 1)
    newOrder.splice(nextIndex, 0, moved)
    reorderSessions(newOrder)
  }

  if (loading) {
    return <p className="text-gray-500">{t('loading')}</p>
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">{t('newTitle')}</Label>
            <Input
              id="session-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('titlePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-desc">{t('description')}</Label>
            <Textarea
              id="session-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              rows={2}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? t('creating') : t('addSession')}
          </Button>
        </CardContent>
      </Card>

      {sessions.length === 0 ? (
        <p className="text-gray-500">{t('noSessions')}</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, index) => {
            const count = questionCountBySession.get(session.id) || 0
            const isEditing = editingId === session.id
            return (
              <Card key={session.id}>
                <CardContent className="pt-6 space-y-3">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label>{t('title')}</Label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('descriptionLabel')}</Label>
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('guidanceNote')}</Label>
                        <Textarea
                          value={editForm.guidanceNote}
                          onChange={(e) => setEditForm({ ...editForm, guidanceNote: e.target.value })}
                          placeholder={t('guidanceNotePlaceholder')}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(session.id)}>{t('save')}</Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>{t('cancel')}</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-medium">{session.title}</p>
                          {session.description && (
                            <p className="text-sm text-gray-600">{session.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {t('questionCount', { count })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveSession(index, 'up')}
                            disabled={index === 0}
                          >
                            {t('up')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveSession(index, 'down')}
                            disabled={index === sessions.length - 1}
                          >
                            {t('down')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startEdit(session)}>
                            {t('edit')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteSession(session.id)}>
                            {tc('delete')}
                          </Button>
                        </div>
                      </div>
                      <SessionGuidanceInline
                        sessionId={session.id}
                        initialNote={session.guidance_note || ''}
                        onSave={saveGuidance}
                        label={t('guidanceNote')}
                        placeholder={t('guidanceNotePlaceholder')}
                        saveLabel={t('save')}
                        savedLabel={tc('saving')}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface SessionGuidanceInlineProps {
  sessionId: string
  initialNote: string
  onSave: (sessionId: string, note: string) => Promise<boolean>
  label: string
  placeholder: string
  saveLabel: string
  savedLabel: string
}

function SessionGuidanceInline({
  sessionId,
  initialNote,
  onSave,
  label,
  placeholder,
  saveLabel,
  savedLabel,
}: SessionGuidanceInlineProps) {
  const [value, setValue] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const dirty = value.trim() !== initialNote.trim()

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave(sessionId, value)
    setSaving(false)
    if (ok) {
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1500)
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/40 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-blue-900">{label}</Label>
        {justSaved && <span className="text-xs text-green-700">✓</span>}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="bg-white"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? savedLabel : saveLabel}
        </Button>
      </div>
    </div>
  )
}
