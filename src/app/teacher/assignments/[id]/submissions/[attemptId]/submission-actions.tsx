'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SubmissionActionsProps {
  attemptId: string
  assignmentId: string
}

export function SubmissionActions({ attemptId, assignmentId }: SubmissionActionsProps) {
  const router = useRouter()
  const t = useTranslations('submissions')
  const tc = useTranslations('common')
  const [isLoading, setIsLoading] = useState(false)
  const [dialogState, setDialogState] = useState<{
    open: boolean
    action: 'delete' | 'regrade' | null
  }>({ open: false, action: null })

  const openDialog = (action: 'delete' | 'regrade') => {
    setDialogState({ open: true, action })
  }

  const closeDialog = () => {
    setDialogState({ open: false, action: null })
  }

  const handleAction = async () => {
    if (!dialogState.action) return

    setIsLoading(true)
    try {
      const url = dialogState.action === 'delete'
        ? `/api/attempts/${attemptId}`
        : `/api/attempts/${attemptId}/regrade`

      const response = await fetch(url, {
        method: dialogState.action === 'delete' ? 'DELETE' : 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('operationFailed'))
      }

      closeDialog()

      if (dialogState.action === 'delete') {
        // Redirect to submissions list after delete
        router.push(`/teacher/assignments/${assignmentId}/submissions`)
      } else {
        // Refresh page after regrade
        router.refresh()
      }
    } catch (error) {
      console.error('Action error:', error)
      alert(error instanceof Error ? error.message : t('operationFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => openDialog('regrade')}
          disabled={isLoading}
        >
          {t('regrade')}
        </Button>
        <Button
          variant="destructive"
          onClick={() => openDialog('delete')}
          disabled={isLoading}
        >
          {t('delete')}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.action === 'delete' ? t('deleteTitle') : t('regradeTitle')}
            </DialogTitle>
            <DialogDescription>
              {dialogState.action === 'delete' ? (
                t('singleDeleteConfirm')
              ) : (
                t('singleRegradeConfirm')
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              {tc('cancel')}
            </Button>
            <Button
              variant={dialogState.action === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
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
