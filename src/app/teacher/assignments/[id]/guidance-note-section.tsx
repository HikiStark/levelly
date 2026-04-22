'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface GuidanceNoteSectionProps {
  assignmentId: string
  initialNote: string | null
}

export function GuidanceNoteSection({ assignmentId, initialNote }: GuidanceNoteSectionProps) {
  const t = useTranslations('guidance')
  const tc = useTranslations('common')
  const [value, setValue] = useState(initialNote || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const dirty = (value || '').trim() !== (initialNote || '').trim()

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guidance_note: value.trim() || null }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || t('saveFailed'))
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{t('description')}</p>
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {!error && savedAt && !dirty && (
        <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
          {t('saved')}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="guidance-note">{t('label')}</Label>
        <Textarea
          id="guidance-note"
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('placeholder')}
        />
      </div>
      <Button onClick={handleSave} disabled={saving || !dirty}>
        {saving ? tc('saving') : tc('save')}
      </Button>
    </div>
  )
}
