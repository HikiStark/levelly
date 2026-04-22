'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface EditDetailsDialogProps {
  assignmentId: string
  initialTitle: string
  initialDescription: string | null
}

export function EditDetailsDialog({
  assignmentId,
  initialTitle,
  initialDescription,
}: EditDetailsDialogProps) {
  const t = useTranslations('assignment')
  const tc = useTranslations('common')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    const trimmed = title.trim()
    if (!trimmed) {
      setError(t('titleRequired'))
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || t('saveFailed'))
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setTitle(initialTitle)
          setDescription(initialDescription || '')
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{t('editDetails')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editDetailsTitle')}</DialogTitle>
          <DialogDescription>{t('editDetailsDesc')}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title">{t('titleLabel')}</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">{t('descriptionLabel')}</Label>
            <Textarea
              id="edit-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tc('saving') : tc('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
