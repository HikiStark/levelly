'use client'

import { useState } from 'react'
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

interface Attempt {
  id: string
  student_name: string | null
  student_email: string | null
  submitted_at: string | null
  status: string
  is_final: boolean
  total_score: number
  max_score: number
  level: string | null
}

interface SubmissionsTableProps {
  attempts: Attempt[]
  assignmentId: string
}

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

export function SubmissionsTable({ attempts, assignmentId }: SubmissionsTableProps) {
  const router = useRouter()
  const t = useTranslations('submissions')
  const tc = useTranslations('common')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [dialogState, setDialogState] = useState<{
    open: boolean
    action: 'delete' | 'regrade' | null
    targetIds: string[]
  }>({ open: false, action: null, targetIds: [] })

  const submittedAttempts = attempts.filter(a => a.status !== 'in_progress')

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === submittedAttempts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(submittedAttempts.map(a => a.id)))
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

      {submittedAttempts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t('noSubmissions')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === submittedAttempts.length && submittedAttempts.length > 0}
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
            {submittedAttempts.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(attempt.id)}
                    onChange={() => toggleSelect(attempt.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{attempt.student_name || tc('anonymous')}</p>
                    <p className="text-sm text-gray-500">{attempt.student_email || tc('noData')}</p>
                  </div>
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
                      <Button variant="outline" size="sm">
                        {t('view')}
                      </Button>
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
            ))}
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
