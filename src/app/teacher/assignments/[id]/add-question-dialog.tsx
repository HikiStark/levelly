'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { ImageUpload } from '@/components/ui/image-upload'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Question, QuestionType, Session, SliderConfig } from '@/lib/supabase/types'

interface AddQuestionDialogProps {
  assignmentId: string
  questions: Question[]
  initialSessionId?: string | null
}

export function AddQuestionDialog({ assignmentId, questions, initialSessionId = null }: AddQuestionDialogProps) {
  const [open, setOpen] = useState(false)
  const [questionType, setQuestionType] = useState<QuestionType>('mcq')
  const [prompt, setPrompt] = useState('')
  const [points, setPoints] = useState(1)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId)

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

  // Slider fields
  const [sliderMin, setSliderMin] = useState(0)
  const [sliderMax, setSliderMax] = useState(100)
  const [sliderStep, setSliderStep] = useState(1)
  const [sliderCorrectValue, setSliderCorrectValue] = useState(50)
  const [sliderTolerance, setSliderTolerance] = useState(5)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch(`/api/sessions?assignmentId=${assignmentId}`)
        const data = await response.json()
        if (response.ok) {
          setSessions(data.sessions || [])
        }
      } catch {
        setSessions([])
      }
    }
    fetchSessions()
  }, [assignmentId])

  const resetForm = () => {
    setQuestionType('mcq')
    setPrompt('')
    setPoints(1)
    setImageUrl(null)
    setSelectedSessionId(null)
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
    // Reset slider fields
    setSliderMin(0)
    setSliderMax(100)
    setSliderStep(1)
    setSliderCorrectValue(50)
    setSliderTolerance(5)
    setError(null)
  }

  const getNextOrderIndex = (sessionId: string | null) => {
    const relevant = questions.filter(q => (q.session_id || null) === sessionId)
    const maxIndex = relevant.reduce((max, q) => Math.max(max, q.order_index), -1)
    return maxIndex + 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const questionData: Record<string, unknown> = {
      assignment_id: assignmentId,
      session_id: selectedSessionId,
      type: questionType,
      prompt,
      points,
      order_index: getNextOrderIndex(selectedSessionId),
      image_url: imageUrl,
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
    } else if (questionType === 'open') {
      questionData.reference_answer = referenceAnswer || null
      questionData.rubric = rubric || null
    } else if (questionType === 'slider') {
      // Validate slider config
      if (sliderMin >= sliderMax) {
        setError('Maximum value must be greater than minimum value')
        setLoading(false)
        return
      }
      if (sliderCorrectValue < sliderMin || sliderCorrectValue > sliderMax) {
        setError('Correct value must be between min and max')
        setLoading(false)
        return
      }
      if (sliderTolerance < 0) {
        setError('Tolerance must be 0 or greater')
        setLoading(false)
        return
      }

      const sliderConfig: SliderConfig = {
        min: sliderMin,
        max: sliderMax,
        step: sliderStep,
        correct_value: sliderCorrectValue,
        tolerance: sliderTolerance,
      }
      questionData.slider_config = sliderConfig
    }
    // Note: image_map type will be handled by the ImageMapEditor component

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setSelectedSessionId(initialSessionId)
        }
      }}
    >
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

          {/* Session Selection */}
          {sessions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="session-select">Session</Label>
              <select
                id="session-select"
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(e.target.value || null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">No session (legacy)</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Question Type */}
          <div className="space-y-2">
            <Label>Question Type</Label>
            <RadioGroup
              value={questionType}
              onValueChange={(v) => setQuestionType(v as QuestionType)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mcq" id="mcq" />
                <Label htmlFor="mcq" className="cursor-pointer">Multiple Choice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="open" id="open" />
                <Label htmlFor="open" className="cursor-pointer">Open-ended</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="slider" id="slider" />
                <Label htmlFor="slider" className="cursor-pointer">Slider</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image_map" id="image_map" />
                <Label htmlFor="image_map" className="cursor-pointer">Image Map</Label>
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

          {/* Slider Fields */}
          {questionType === 'slider' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sliderMin">Minimum Value</Label>
                  <Input
                    id="sliderMin"
                    type="number"
                    value={sliderMin}
                    onChange={(e) => setSliderMin(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sliderMax">Maximum Value</Label>
                  <Input
                    id="sliderMax"
                    type="number"
                    value={sliderMax}
                    onChange={(e) => setSliderMax(parseFloat(e.target.value) || 100)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sliderStep">Step</Label>
                  <Input
                    id="sliderStep"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={sliderStep}
                    onChange={(e) => setSliderStep(parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sliderTolerance">Tolerance (±)</Label>
                  <Input
                    id="sliderTolerance"
                    type="number"
                    min={0}
                    value={sliderTolerance}
                    onChange={(e) => setSliderTolerance(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-sm text-gray-500">
                    Answer is correct if within ± this value
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sliderCorrect">Correct Value</Label>
                <Input
                  id="sliderCorrect"
                  type="number"
                  value={sliderCorrectValue}
                  onChange={(e) => setSliderCorrectValue(parseFloat(e.target.value) || 0)}
                />
              </div>
              {/* Preview */}
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <Label>Preview</Label>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{sliderMin}</span>
                  <span className="font-medium">{sliderCorrectValue}</span>
                  <span>{sliderMax}</span>
                </div>
                <Slider
                  min={sliderMin}
                  max={sliderMax}
                  step={sliderStep}
                  value={[sliderCorrectValue]}
                  onValueChange={(v) => setSliderCorrectValue(v[0])}
                />
              </div>
            </div>
          )}

          {/* Image Map Note */}
          {questionType === 'image_map' && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Image Map questions require a dedicated editor. After creating the question,
                you&apos;ll be able to upload an image and place interactive flags on it.
              </p>
            </div>
          )}

          {/* Optional Image Upload (for mcq, open, slider) */}
          {(questionType === 'mcq' || questionType === 'open' || questionType === 'slider') && (
            <div className="space-y-2">
              <Label>Question Image (optional)</Label>
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
              />
              <p className="text-sm text-gray-500">
                Add an image to help illustrate the question
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
