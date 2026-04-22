'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface FeedbackSettingsSectionProps {
  assignmentId: string
  showCorrectAnswers: boolean
  showAiFeedback: boolean
  showResults: boolean
}

export function FeedbackSettingsSection({
  assignmentId,
  showCorrectAnswers,
  showAiFeedback,
  showResults,
}: FeedbackSettingsSectionProps) {
  const t = useTranslations('feedback')
  const [correctAnswers, setCorrectAnswers] = useState(showCorrectAnswers)
  const [aiFeedback, setAiFeedback] = useState(showAiFeedback)
  const [results, setResults] = useState(showResults)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const persist = async (patch: Record<string, boolean>) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleResults = async (enabled: boolean) => {
    setResults(enabled)
    await persist({ show_results: enabled })
  }

  const handleToggleCorrectAnswers = async (enabled: boolean) => {
    setCorrectAnswers(enabled)
    await persist({ show_correct_answers: enabled })
  }

  const handleToggleAiFeedback = async (enabled: boolean) => {
    setAiFeedback(enabled)
    await persist({ show_ai_feedback: enabled })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t('controlInfo')}</p>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
          <div className="space-y-0.5 pr-4">
            <Label htmlFor="show-results" className="cursor-pointer font-medium">
              {t('showResults')}
            </Label>
            <p className="text-sm text-gray-500">{t('showResultsDesc')}</p>
          </div>
          <Switch
            id="show-results"
            checked={results}
            onCheckedChange={handleToggleResults}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <Label htmlFor="show-correct-answers" className="cursor-pointer">
              {t('showCorrectAnswers')}
            </Label>
            <p className="text-sm text-gray-500">{t('showCorrectAnswersDesc')}</p>
          </div>
          <Switch
            id="show-correct-answers"
            checked={correctAnswers}
            onCheckedChange={handleToggleCorrectAnswers}
            disabled={saving || !results}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <Label htmlFor="show-ai-feedback" className="cursor-pointer">
              {t('showAiFeedback')}
            </Label>
            <p className="text-sm text-gray-500">{t('showAiFeedbackDesc')}</p>
          </div>
          <Switch
            id="show-ai-feedback"
            checked={aiFeedback}
            onCheckedChange={handleToggleAiFeedback}
            disabled={saving || !results}
          />
        </div>
      </div>
    </div>
  )
}
