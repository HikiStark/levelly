'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Attempt {
  id: string
  student_name: string | null
  student_email: string | null
  student_age: number | null
  student_gender: string | null
  submitted_at: string | null
  status: string
  is_final: boolean
  total_score: number
  max_score: number
  level: string | null
  journey_id: string | null
  session_id: string | null
}

interface Session {
  id: string
  title: string
  order_index: number
}

interface Journey {
  id: string
  student_name: string | null
  student_email: string | null
  student_age: number | null
  student_gender: string | null
  overall_status: string
  started_at: string
  completed_at: string | null
}

interface SubmissionsTableProps {
  attempts: Attempt[]
  assignmentId: string
  sessions: Session[]
  journeys: Journey[]
}

type Row =
  | { kind: 'single'; attempt: Attempt }
  | { kind: 'journey'; journey: Journey; attempts: Attempt[] }

function getLevelBadgeVariant(level: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'advanced':
      return 'default'
    case 'intermediate':
      return 'secondary'
    case 'beginner':
      return 'outline'
    default:
      return 'secondary'
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'graded':
      return 'default'
    case 'submitted':
      return 'secondary'
    case 'in_progress':
      return 'outline'
    default:
      return 'secondary'
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

function displayGender(gender: string | null, tc: (key: string) => string): string {
  if (!gender) return tc('noData')
  switch (gender) {
    case 'male': return 'M'
    case 'female': return 'F'
    case 'non_binary': return 'NB'
    case 'prefer_not_to_say': return '—'
    default: return gender
  }
}

export function SubmissionsTable({ attempts, assignmentId, sessions, journeys }: SubmissionsTableProps) {
  const router = useRouter()
  const t = useTranslations('submissions')
  const tc = useTranslations('common')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [dialogState, setDialogState] = useState<{
    open: boolean
    action: 'delete' | 'regrade' | null
    targetIds: string[]
  }>({ open: false, action: null, targetIds: [] })

  const sessionMap = useMemo(() => {
    const map = new Map<string, Session>()
    sessions.forEach(s => map.set(s.id, s))
    return map
  }, [sessions])

  const { rows, allAttemptIds } = useMemo(() => {
    const submitted = attempts.filter(a => a.status !== 'in_progress')

    const byJourney = new Map<string, Attempt[]>()
    const standalone: Attempt[] = []
    for (const a of submitted) {
      if (a.journey_id) {
        const existing = byJourney.get(a.journey_id) || []
        existing.push(a)
        byJourney.set(a.journey_id, existing)
      } else {
        standalone.push(a)
      }
    }

    const journeyRows: Row[] = []
    for (const j of journeys) {
      const jAttempts = byJourney.get(j.id)
      if (jAttempts && jAttempts.length > 0) {
        // sort session attempts by session order
        const sorted = [...jAttempts].sort((a, b) => {
          const ao = a.session_id ? sessionMap.get(a.session_id)?.order_index ?? 999 : 999
          const bo = b.session_id ? sessionMap.get(b.session_id)?.order_index ?? 999 : 999
          return ao - bo
        })
        journeyRows.push({ kind: 'journey', journey: j, attempts: sorted })
      }
    }
    const singleRows: Row[] = standalone.map(attempt => ({ kind: 'single', attempt }))

    const combined: Row[] = [...journeyRows, ...singleRows].sort((a, b) => {
      const aDate =
        a.kind === 'single'
          ? a.attempt.submitted_at
          : a.attempts[a.attempts.length - 1]?.submitted_at || a.journey.started_at
      const bDate =
        b.kind === 'single'
          ? b.attempt.submitted_at
          : b.attempts[b.attempts.length - 1]?.submitted_at || b.journey.started_at
      return (new Date(bDate || 0).getTime()) - (new Date(aDate || 0).getTime())
    })

    const ids: string[] = []
    for (const r of combined) {
      if (r.kind === 'single') ids.push(r.attempt.id)
      else r.attempts.forEach(a => ids.push(a.id))
    }
    return { rows: combined, allAttemptIds: ids }
  }, [attempts, journeys, sessionMap])

  const toggleExpand = (journeyId: string) => {
    const next = new Set(expanded)
    if (next.has(journeyId)) next.delete(journeyId)
    else next.add(journeyId)
    setExpanded(next)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === allAttemptIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allAttemptIds))
    }
  }

  const openDialog = (action: 'delete' | 'regrade', targetIds: string[]) => {
    setDialogState({ open: true, action, targetIds })
  }

  const closeDialog = () => {
    setDialogState({ open: false, action: null, targetIds: [] })
  }

  const handleBulkAction = async () => {
    if (!dialogState.action || dialogState.targetIds.length === 0) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/attempts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: dialogState.action,
          attemptIds: dialogState.targetIds,
          assignmentId,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('operationFailed'))
      }
      setSelectedIds(new Set())
      closeDialog()
      router.refresh()
    } catch (error) {
      console.error('Bulk action error:', error)
      alert(error instanceof Error ? error.message : t('operationFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSingleAction = async (action: 'delete' | 'regrade', attemptId: string) => {
    setIsLoading(true)
    try {
      const url = action === 'delete'
        ? `/api/attempts/${attemptId}`
        : `/api/attempts/${attemptId}/regrade`
      const response = await fetch(url, {
        method: action === 'delete' ? 'DELETE' : 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('operationFailed'))
      }
      closeDialog()
      router.refresh()
    } catch (error) {
      console.error('Single action error:', error)
      alert(error instanceof Error ? error.message : t('operationFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const hasSelection = selectedIds.size > 0

  const renderStudent = (name: string | null, email: string | null, age: number | null, gender: string | null) => (
    <div>
      <p className="font-medium">{name || tc('anonymous')}</p>
      <p className="text-sm text-gray-500">{email || tc('noData')}</p>
      {(age != null || gender) && (
        <p className="text-xs text-gray-500 mt-1">
          {t('age')}: {age ?? '—'} · {t('gender')}: {displayGender(gender, tc)}
        </p>
      )}
    </div>
  )

  const renderAttemptRow = (attempt: Attempt, opts?: { sessionLabel?: string; indent?: boolean }) => (
    <TableRow key={attempt.id}>
      <TableCell>
        <input
          type="checkbox"
          checked={selectedIds.has(attempt.id)}
          onChange={() => toggleSelect(attempt.id)}
          className="h-4 w-4 rounded border-gray-300"
        />
      </TableCell>
      <TableCell className={opts?.indent ? 'pl-10' : ''}>
        {opts?.sessionLabel ? (
          <span className="text-sm text-gray-700">{opts.sessionLabel}</span>
        ) : (
          renderStudent(attempt.student_name, attempt.student_email, attempt.student_age, attempt.student_gender)
        )}
      </TableCell>
      <TableCell>{formatDate(attempt.submitted_at)}</TableCell>
      <TableCell>
        <Badge variant={getStatusBadgeVariant(attempt.status)}>
          {attempt.is_final ? 'Graded' : attempt.status === 'grading' ? t('grading') : attempt.status}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="font-medium">{attempt.total_score}</span>
        <span className="text-gray-500">/{attempt.max_score}</span>
        <span className="text-gray-400 text-sm ml-1">
          ({attempt.max_score > 0 ? Math.round((attempt.total_score / attempt.max_score) * 100) : 0}%)
        </span>
      </TableCell>
      <TableCell>
        {attempt.level ? (
          <Badge variant={getLevelBadgeVariant(attempt.level)}>
            {attempt.level}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/teacher/assignments/${assignmentId}/submissions/${attempt.id}`}>
            <Button variant="outline" size="sm">{t('view')}</Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openDialog('regrade', [attempt.id])}
            disabled={isLoading}
          >
            {t('regrade')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openDialog('delete', [attempt.id])}
            disabled={isLoading}
          >
            {t('delete')}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )

  const renderJourneyRow = (row: Extract<Row, { kind: 'journey' }>) => {
    const { journey, attempts: jAttempts } = row
    const isExpanded = expanded.has(journey.id)
    const totalScore = jAttempts.reduce((s, a) => s + a.total_score, 0)
    const totalMax = jAttempts.reduce((s, a) => s + a.max_score, 0)
    const isFinal = jAttempts.every(a => a.is_final)
    const latestSubmitted = jAttempts.reduce<string | null>(
      (acc, a) => (a.submitted_at && (!acc || a.submitted_at > acc) ? a.submitted_at : acc),
      null
    )
    const childIds = jAttempts.map(a => a.id)
    const allChildrenSelected = childIds.every(id => selectedIds.has(id))

    return (
      <>
        <TableRow key={journey.id} className="bg-gray-50/60">
          <TableCell>
            <input
              type="checkbox"
              checked={allChildrenSelected}
              onChange={() => {
                const next = new Set(selectedIds)
                if (allChildrenSelected) {
                  childIds.forEach(id => next.delete(id))
                } else {
                  childIds.forEach(id => next.add(id))
                }
                setSelectedIds(next)
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
          </TableCell>
          <TableCell>
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => toggleExpand(journey.id)}
                className="mt-1 text-gray-500 hover:text-gray-900"
                aria-label={isExpanded ? t('collapse') : t('expand')}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="flex-1">
                {renderStudent(journey.student_name, journey.student_email, journey.student_age, journey.student_gender)}
                <p className="text-xs text-gray-500 mt-1">{t('journeyLabel')} · {jAttempts.length} {t('sessions').toLowerCase()}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>{formatDate(latestSubmitted)}</TableCell>
          <TableCell>
            <Badge variant={isFinal ? 'default' : 'secondary'}>
              {isFinal ? 'Graded' : journey.overall_status}
            </Badge>
          </TableCell>
          <TableCell>
            <span className="font-medium">{totalScore}</span>
            <span className="text-gray-500">/{totalMax}</span>
            <span className="text-gray-400 text-sm ml-1">
              ({totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0}%)
            </span>
          </TableCell>
          <TableCell>
            <span className="text-gray-500 text-sm">{t('overall')}</span>
          </TableCell>
          <TableCell className="text-right">
            <Button variant="outline" size="sm" onClick={() => toggleExpand(journey.id)}>
              {isExpanded ? t('collapse') : t('expand')}
            </Button>
          </TableCell>
        </TableRow>
        {isExpanded &&
          jAttempts.map((attempt, i) => {
            const sessionTitle = attempt.session_id ? sessionMap.get(attempt.session_id)?.title : null
            const label = sessionTitle
              ? `${t('sessionLabel', { index: i + 1 })}: ${sessionTitle}`
              : t('sessionLabel', { index: i + 1 })
            return renderAttemptRow(attempt, { sessionLabel: label, indent: true })
          })}
      </>
    )
  }

  return (
    <>
      {/* Bulk Action Bar */}
      {hasSelection && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg mb-4">
          <span className="text-sm text-blue-900">
            {t('selected', { count: selectedIds.size })}
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDialog('regrade', Array.from(selectedIds))}
              disabled={isLoading}
            >
              {t('regradeSelected')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => openDialog('delete', Array.from(selectedIds))}
              disabled={isLoading}
            >
              {t('deleteSelected')}
            </Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t('noSubmissions')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={allAttemptIds.length > 0 && selectedIds.size === allAttemptIds.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </TableHead>
              <TableHead>{t('student')}</TableHead>
              <TableHead>{t('submitted')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('score')}</TableHead>
              <TableHead>{t('level')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              if (row.kind === 'single') return renderAttemptRow(row.attempt)
              return renderJourneyRow(row)
            })}
          </TableBody>
        </Table>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.action === 'delete'
                ? dialogState.targetIds.length > 1 ? t('deleteTitlePlural') : t('deleteTitle')
                : dialogState.targetIds.length > 1 ? t('regradeTitlePlural') : t('regradeTitle')}
            </DialogTitle>
            <DialogDescription>
              {dialogState.action === 'delete' ? (
                t('deleteConfirm', { count: dialogState.targetIds.length })
              ) : (
                t('regradeConfirm', { count: dialogState.targetIds.length })
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              {tc('cancel')}
            </Button>
            <Button
              variant={dialogState.action === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (dialogState.targetIds.length === 1) {
                  handleSingleAction(dialogState.action!, dialogState.targetIds[0])
                } else {
                  handleBulkAction()
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? t('processing') : dialogState.action === 'delete' ? t('delete') : t('regrade')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
