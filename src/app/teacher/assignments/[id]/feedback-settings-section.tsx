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

interface AssignmentResponse {
  show_correct_answers?: boolean
  show_ai_feedback?: boolean
  show_results?: boolean
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
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const router = useRouter()

  const persist = async (
    patch: Record<string, boolean>,
    rollback: () => void
  ): Promise<boolean> => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }
      // Re-sync UI state with what was actually persisted.
      const persisted = (data.assignment || {}) as AssignmentResponse
      if (typeof persisted.show_correct_answers === 'boolean') {
        setCorrectAnswers(persisted.show_correct_answers)
      }
      if (typeof persisted.show_ai_feedback === 'boolean') {
        setAiFeedback(persisted.show_ai_feedback)
      }
      if (typeof persisted.show_results === 'boolean') {
        setResults(persisted.show_results)
      } else if ('show_results' in patch) {
        // Column didn't come back — DB schema is missing it.
        rollback()
        throw new Error(
          'The "Show results" column is missing from your database. Apply migration 010_levelly_fixes_and_features.sql and try again.'
        )
      }
      setSavedAt(Date.now())
      router.refresh()
      return true
    } catch (err) {
      rollback()
      setError(err instanceof Error ? err.message : 'Failed to save')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleToggleResults = async (enabled: boolean) => {
    const prev = results
    setResults(enabled)
    await persist({ show_results: enabled }, () => setResults(prev))
  }

  const handleToggleCorrectAnswers = async (enabled: boolean) => {
    const prev = correctAnswers
    setCorrectAnswers(enabled)
    await persist({ show_correct_answers: enabled }, () => setCorrectAnswers(prev))
  }

  const handleToggleAiFeedback = async (enabled: boolean) => {
    const prev = aiFeedback
    setAiFeedback(enabled)
    await persist({ show_ai_feedback: enabled }, () => setAiFeedback(prev))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{t('controlInfo')}</p>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {!error && savedAt && (
        <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
          Saved.
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
          <div className="space-y-0.5 pr-4">
            <Label htmlFor="show-results" className="cursor-pointer font-medium">
              {t('showResults')}
            </Label>
            <p className="text-sm text-gray-500">{t('showResultsDesc')}</p>
            <p className="text-xs text-gray-400 mt-1">
              Currently {results ? 'visible to students' : 'hidden from students'}.
            </p>
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
