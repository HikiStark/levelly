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

interface AddQuestionDialogProps {
  assignmentId: string
  nextOrderIndex: number
}

export function AddQuestionDialog({ assignmentId, nextOrderIndex }: AddQuestionDialogProps) {
  const [open, setOpen] = useState(false)
  const [questionType, setQuestionType] = useState<'mcq' | 'open'>('mcq')
  const [prompt, setPrompt] = useState('')
  const [points, setPoints] = useState(1)

  // MCQ fields
  const [choices, setChoices] = useState([
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ])
  const [correctChoice, setCorrectChoice] = useState('a')
  const [allowMultipleCorrect, setAllowMultipleCorrect] = useState(false)
  const [correctChoices, setCorrectChoices] = useState<string[]>([])

  // Open answer fields
  const [referenceAnswer, setReferenceAnswer] = useState('')
  const [rubric, setRubric] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const resetForm = () => {
    setQuestionType('mcq')
    setPrompt('')
    setPoints(1)
    setChoices([
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ])
    setCorrectChoice('a')
    setAllowMultipleCorrect(false)
    setCorrectChoices([])
    setReferenceAnswer('')
    setRubric('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const questionData: Record<string, unknown> = {
      assignment_id: assignmentId,
      type: questionType,
      prompt,
      points,
      order_index: nextOrderIndex,
    }

    if (questionType === 'mcq') {
      const filledChoices = choices.filter(c => c.text.trim())
      if (filledChoices.length < 2) {
        setError('Please provide at least 2 choices')
        setLoading(false)
        return
      }
      if (allowMultipleCorrect) {
        if (correctChoices.length < 2) {
          setError('Please select at least 2 correct answers for multiple-answer questions')
          setLoading(false)
          return
        }
        // Store as comma-separated values
        questionData.correct_choice = correctChoices.join(',')
      } else {
        questionData.correct_choice = correctChoice
      }
      questionData.choices = filledChoices
    } else {
      questionData.reference_answer = referenceAnswer || null
      questionData.rubric = rubric || null
    }

    const { error: insertError } = await supabase
      .from('question')
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
    setChoices(choices.map(c => (c.id === id ? { ...c, text } : c)))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Question</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Question</DialogTitle>
          <DialogDescription>
            Create a multiple choice or open-ended question
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
              onValueChange={(v) => setQuestionType(v as 'mcq' | 'open')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mcq" id="mcq" />
                <Label htmlFor="mcq" className="cursor-pointer">Multiple Choice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="open" />
                <Label htmlFor="open" className="cursor-pointer">Open-ended</Label>
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

          {/* Points */}
          <div className="space-y-2">
            <Label htmlFor="points">Points</Label>
            <Input
              id="points"
              type="number"
              min={1}
              max={10}
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
              className="w-24"
            />
          </div>

          {/* MCQ Fields */}
          {questionType === 'mcq' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-multiple"
                  checked={allowMultipleCorrect}
                  onCheckedChange={(checked) => {
                    setAllowMultipleCorrect(checked === true)
                    if (checked) {
                      setCorrectChoices([])
                    }
                  }}
                />
                <Label htmlFor="allow-multiple" className="cursor-pointer">
                  Allow multiple correct answers (students must select all)
                </Label>
              </div>

              <Label>Answer Choices</Label>
              {allowMultipleCorrect ? (
                <div className="space-y-3">
                  {choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`correct-${choice.id}`}
                        checked={correctChoices.includes(choice.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCorrectChoices([...correctChoices, choice.id])
                          } else {
                            setCorrectChoices(correctChoices.filter(c => c !== choice.id))
                          }
                        }}
                      />
                      <Label htmlFor={`correct-${choice.id}`} className="w-6">
                        {choice.id.toUpperCase()})
                      </Label>
                      <Input
                        placeholder={`Option ${choice.id.toUpperCase()}`}
                        value={choice.text}
                        onChange={(e) => updateChoice(choice.id, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  ))}
                  <p className="text-sm text-gray-500">
                    Check all the correct answers (minimum 2)
                  </p>
                </div>
              ) : (
                <>
                  <RadioGroup
                    value={correctChoice}
                    onValueChange={setCorrectChoice}
                    className="space-y-3"
                  >
                    {choices.map((choice) => (
                      <div key={choice.id} className="flex items-center gap-3">
                        <RadioGroupItem
                          value={choice.id}
                          id={`correct-${choice.id}`}
                        />
                        <Label htmlFor={`correct-${choice.id}`} className="w-6">
                          {choice.id.toUpperCase()})
                        </Label>
                        <Input
                          placeholder={`Option ${choice.id.toUpperCase()}`}
                          value={choice.text}
                          onChange={(e) => updateChoice(choice.id, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </RadioGroup>
                  <p className="text-sm text-gray-500">
                    Select the radio button next to the correct answer
                  </p>
                </>
              )}
            </div>
          )}

          {/* Open Answer Fields */}
          {questionType === 'open' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Reference Answer (optional)</Label>
                <Textarea
                  id="reference"
                  placeholder="The ideal answer for comparison..."
                  value={referenceAnswer}
                  onChange={(e) => setReferenceAnswer(e.target.value)}
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  Helps AI grade more accurately
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rubric">Grading Rubric (optional)</Label>
                <Textarea
                  id="rubric"
                  placeholder="e.g., Must mention X, Y, Z concepts..."
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                  rows={2}
                />
              </div>
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
