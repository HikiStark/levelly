'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface FeedbackSettingsSectionProps {
  assignmentId: string
  showCorrectAnswers: boolean
  showAiFeedback: boolean
}

export function FeedbackSettingsSection({
  assignmentId,
  showCorrectAnswers,
  showAiFeedback,
}: FeedbackSettingsSectionProps) {
  const [correctAnswers, setCorrectAnswers] = useState(showCorrectAnswers)
  const [aiFeedback, setAiFeedback] = useState(showAiFeedback)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleToggleCorrectAnswers = async (enabled: boolean) => {
    setCorrectAnswers(enabled)
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('assignment')
      .update({ show_correct_answers: enabled })
      .eq('id', assignmentId)
    setSaving(false)
    router.refresh()
  }

  const handleToggleAiFeedback = async (enabled: boolean) => {
    setAiFeedback(enabled)
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('assignment')
      .update({ show_ai_feedback: enabled })
      .eq('id', assignmentId)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Control what information students can see after completing the quiz.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-correct-answers" className="cursor-pointer">
              Show correct answers
            </Label>
            <p className="text-sm text-gray-500">
              Students will see the correct answer for each question
            </p>
          </div>
          <Switch
            id="show-correct-answers"
            checked={correctAnswers}
            onCheckedChange={handleToggleCorrectAnswers}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-ai-feedback" className="cursor-pointer">
              Show AI feedback
            </Label>
            <p className="text-sm text-gray-500">
              Students will see AI-generated feedback for open-ended questions
            </p>
          </div>
          <Switch
            id="show-ai-feedback"
            checked={aiFeedback}
            onCheckedChange={handleToggleAiFeedback}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  )
}
