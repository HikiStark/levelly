'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Questionnaire, QuestionnaireQuestion } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { QuestionnaireQuestionList } from './questionnaire-question-list'
import { AddQuestionnaireQuestionDialog } from './add-questionnaire-question-dialog'

interface QuestionnaireSectionProps {
  assignmentId: string
  questionnaire: Questionnaire | null
  questions: QuestionnaireQuestion[]
}

export function QuestionnaireSection({
  assignmentId,
  questionnaire,
  questions,
}: QuestionnaireSectionProps) {
  const [isEnabled, setIsEnabled] = useState(questionnaire?.is_enabled ?? false)
  const [title, setTitle] = useState(questionnaire?.title ?? 'Post-Quiz Feedback')
  const [description, setDescription] = useState(questionnaire?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const titleChanged = title !== (questionnaire?.title ?? 'Post-Quiz Feedback')
    const descChanged = description !== (questionnaire?.description ?? '')
    const enabledChanged = isEnabled !== (questionnaire?.is_enabled ?? false)
    setHasChanges(titleChanged || descChanged || enabledChanged)
  }, [title, description, isEnabled, questionnaire])

  const createOrUpdateQuestionnaire = async () => {
    setSaving(true)

    if (questionnaire) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('questionnaire')
        .update({
          title,
          description: description || null,
          is_enabled: isEnabled,
        })
        .eq('id', questionnaire.id)
    } else {
      // Create new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('questionnaire').insert({
        assignment_id: assignmentId,
        title,
        description: description || null,
        is_enabled: isEnabled,
      })
    }

    setSaving(false)
    setHasChanges(false)
    router.refresh()
  }

  const handleToggle = async (enabled: boolean) => {
    setIsEnabled(enabled)

    // If toggling and questionnaire exists, save immediately
    if (questionnaire) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('questionnaire')
        .update({ is_enabled: enabled })
        .eq('id', questionnaire.id)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            id="questionnaire-enabled"
            checked={isEnabled}
            onCheckedChange={handleToggle}
          />
          <Label htmlFor="questionnaire-enabled" className="cursor-pointer">
            {isEnabled ? 'Questionnaire enabled' : 'Questionnaire disabled'}
          </Label>
        </div>
        {questionnaire && (
          <Link href={`/teacher/assignments/${assignmentId}/questionnaire-responses`}>
            <Button variant="outline" size="sm">
              View Responses
            </Button>
          </Link>
        )}
      </div>

      {isEnabled && (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q-title">Title</Label>
              <Input
                id="q-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post-Quiz Feedback"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-description">Description (optional)</Label>
              <Textarea
                id="q-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Help us improve by answering a few questions..."
                rows={2}
              />
            </div>

            {hasChanges && (
              <Button onClick={createOrUpdateQuestionnaire} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>

          {questionnaire && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Questions</h4>
                <AddQuestionnaireQuestionDialog
                  questionnaireId={questionnaire.id}
                  nextOrderIndex={questions.length + 1}
                />
              </div>
              <QuestionnaireQuestionList questions={questions} />
            </div>
          )}

          {!questionnaire && (
            <p className="text-sm text-gray-500">
              Save the questionnaire to start adding questions.
            </p>
          )}
        </>
      )}

      {!isEnabled && (
        <p className="text-sm text-gray-500">
          Enable the questionnaire to let students provide feedback after completing the quiz.
        </p>
      )}
    </div>
  )
}
