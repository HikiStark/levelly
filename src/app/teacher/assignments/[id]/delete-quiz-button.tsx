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
import { Trash2 } from 'lucide-react'

interface DeleteQuizButtonProps {
  assignmentId: string
  assignmentTitle: string
}

export function DeleteQuizButton({ assignmentId, assignmentTitle }: DeleteQuizButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const t = useTranslations('assignment')
  const tc = useTranslations('common')

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || t('deleteQuiz'))
        return
      }

      router.push('/teacher')
      router.refresh()
    } catch {
      alert(t('deleteQuiz'))
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
        <Trash2 className="h-4 w-4 mr-2" />
        {t('deleteQuiz')}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirmDescription', { title: assignmentTitle })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('deleting') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
