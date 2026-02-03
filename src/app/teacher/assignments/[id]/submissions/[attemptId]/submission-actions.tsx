'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
        throw new Error(error.error || 'Operation failed')
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
      alert(error instanceof Error ? error.message : 'Operation failed')
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
          Regrade
        </Button>
        <Button
          variant="destructive"
          onClick={() => openDialog('delete')}
          disabled={isLoading}
        >
          Delete
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.action === 'delete' ? 'Delete Submission' : 'Regrade Submission'}
            </DialogTitle>
            <DialogDescription>
              {dialogState.action === 'delete' ? (
                <>
                  Are you sure you want to delete this submission? This action cannot be undone
                  and all answers will be permanently removed.
                </>
              ) : (
                <>
                  Are you sure you want to regrade this submission? This will replace all existing
                  grades and AI feedback. The grading process may take a moment.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant={dialogState.action === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : dialogState.action === 'delete' ? 'Delete' : 'Regrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
