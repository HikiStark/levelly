'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface AddQuestionnaireQuestionDialogProps {
  questionnaireId: string
  nextOrderIndex: number
}

export function AddQuestionnaireQuestionDialog({
  questionnaireId,
  nextOrderIndex,
}: AddQuestionnaireQuestionDialogProps) {
  const [open, setOpen] = useState(false)
  const [questionType, setQuestionType] = useState<'text' | 'rating' | 'mcq'>('text')
  const [prompt, setPrompt] = useState('')
  const [isRequired, setIsRequired] = useState(false)

  // Rating fields
  const [ratingMin, setRatingMin] = useState(1)
  const [ratingMax, setRatingMax] = useState(5)

  // MCQ fields
  const [choices, setChoices] = useState([
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const resetForm = () => {
    setQuestionType('text')
    setPrompt('')
    setIsRequired(false)
    setRatingMin(1)
    setRatingMax(5)
    setChoices([
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ])
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const questionData: Record<string, unknown> = {
      questionnaire_id: questionnaireId,
      type: questionType,
      prompt,
      is_required: isRequired,
      order_index: nextOrderIndex,
    }

    if (questionType === 'rating') {
      questionData.options = { min: ratingMin, max: ratingMax }
    } else if (questionType === 'mcq') {
      const filledChoices = choices.filter((c) => c.text.trim())
      if (filledChoices.length < 2) {
        setError('Please provide at least 2 choices')
        setLoading(false)
        return
      }
      questionData.options = filledChoices
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('questionnaire_question')
      .insert(questionData)

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    resetForm()
    router.refresh()
  }

  const updateChoice = (id: string, text: string) => {
    setChoices(choices.map((c) => (c.id === id ? { ...c, text } : c)))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Questionnaire Question</DialogTitle>
          <DialogDescription>
            Create a feedback question for students to answer after the quiz
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Question Type */}
          <div className="space-y-2">
            <Label>Question Type</Label>
            <RadioGroup
              value={questionType}
              onValueChange={(v) => setQuestionType(v as 'text' | 'rating' | 'mcq')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="text" id="type-text" />
                <Label htmlFor="type-text" className="cursor-pointer">
                  Text Response
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rating" id="type-rating" />
                <Label htmlFor="type-rating" className="cursor-pointer">
                  Rating Scale
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mcq" id="type-mcq" />
                <Label htmlFor="type-mcq" className="cursor-pointer">
                  Multiple Choice
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Question Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Question</Label>
            <Textarea
              id="prompt"
              placeholder="Enter your question here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Required Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is-required"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked === true)}
            />
            <Label htmlFor="is-required" className="cursor-pointer">
              This question is required
            </Label>
          </div>

          {/* Rating Fields */}
          {questionType === 'rating' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating-min">Minimum</Label>
                  <Input
                    id="rating-min"
                    type="number"
                    min={0}
                    max={ratingMax - 1}
                    value={ratingMin}
                    onChange={(e) => setRatingMin(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating-max">Maximum</Label>
                  <Input
                    id="rating-max"
                    type="number"
                    min={ratingMin + 1}
                    max={10}
                    value={ratingMax}
                    onChange={(e) => setRatingMax(parseInt(e.target.value) || 5)}
                    className="w-24"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Students will rate on a scale from {ratingMin} to {ratingMax}
              </p>
            </div>
          )}

          {/* MCQ Fields */}
          {questionType === 'mcq' && (
            <div className="space-y-4">
              <Label>Answer Choices</Label>
              <div className="space-y-3">
                {choices.map((choice) => (
                  <div key={choice.id} className="flex items-center gap-3">
                    <Label className="w-6">{choice.id.toUpperCase()})</Label>
                    <Input
                      placeholder={`Option ${choice.id.toUpperCase()}`}
                      value={choice.text}
                      onChange={(e) => updateChoice(choice.id, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Provide at least 2 choices. Empty options will be ignored.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Question'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
