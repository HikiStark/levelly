'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Question, Session, SliderConfig } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { ImageUpload } from '@/components/ui/image-upload'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface EditQuestionDialogProps {
  question: Question
  assignmentId: string
  questions: Question[]
}

export function EditQuestionDialog({ question, assignmentId, questions }: EditQuestionDialogProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState(question.prompt)
  const [points, setPoints] = useState(question.points)
  const [sessionId, setSessionId] = useState<string | null>(question.session_id)
  const [imageUrl, setImageUrl] = useState<string | null>(question.image_url)
  const [referenceAnswer, setReferenceAnswer] = useState(question.reference_answer || '')
  const [rubric, setRubric] = useState(question.rubric || '')
  const [hasCorrectAnswer, setHasCorrectAnswer] = useState(question.has_correct_answer ?? true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [choices, setChoices] = useState<{ id: string; text: string }[]>([
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ])
  const [allowMultipleCorrect, setAllowMultipleCorrect] = useState(false)
  const [correctChoice, setCorrectChoice] = useState('a')
  const [correctChoices, setCorrectChoices] = useState<string[]>([])

  const [sliderMin, setSliderMin] = useState(0)
  const [sliderMax, setSliderMax] = useState(100)
  const [sliderStep, setSliderStep] = useState(1)
  const [sliderCorrectValue, setSliderCorrectValue] = useState(50)
  const [sliderTolerance, setSliderTolerance] = useState(0)

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

  const initializeForm = () => {
    setPrompt(question.prompt)
    setPoints(question.points)
    setSessionId(question.session_id)
    setImageUrl(question.image_url)
    setReferenceAnswer(question.reference_answer || '')
    setRubric(question.rubric || '')
    setHasCorrectAnswer(question.has_correct_answer ?? true)
    setError(null)

    if (question.type === 'mcq') {
      const existingChoices = (question.choices as { id: string; text: string }[] | null) || []
      const fallback = [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ]
      setChoices(existingChoices.length > 0 ? existingChoices : fallback)

      const split = question.correct_choice?.split(',').map(c => c.trim()).filter(Boolean) || []
      setAllowMultipleCorrect(split.length > 1)
      setCorrectChoices(split)
      setCorrectChoice(split[0] || 'a')
    }

    if (question.type === 'slider') {
      const cfg = question.slider_config
      if (cfg) {
        setSliderMin(cfg.min)
        setSliderMax(cfg.max)
        setSliderStep(cfg.step)
        setSliderCorrectValue(cfg.correct_value)
        setSliderTolerance(cfg.tolerance)
      }
    }
  }

  const getNextOrderIndex = (newSessionId: string | null) => {
    const relevant = questions.filter(
      q => q.id !== question.id && (q.session_id || null) === newSessionId
    )
    const maxIndex = relevant.reduce((max, q) => Math.max(max, q.order_index), -1)
    return maxIndex + 1
  }

  const shouldMoveOrder = (question.session_id || null) !== sessionId

  const sliderConfig = useMemo<SliderConfig>(() => ({
    min: sliderMin,
    max: sliderMax,
    step: sliderStep,
    correct_value: sliderCorrectValue,
    tolerance: sliderTolerance,
  }), [sliderMin, sliderMax, sliderStep, sliderCorrectValue, sliderTolerance])

  const handleSave = async () => {
    setError(null)
    setSaving(true)

    const updateData: Record<string, unknown> = {
      prompt,
      points,
      session_id: sessionId,
      has_correct_answer: hasCorrectAnswer,
      order_index: shouldMoveOrder ? getNextOrderIndex(sessionId) : question.order_index,
    }

    if (question.type !== 'image_map') {
      updateData.image_url = imageUrl
    }

    if (question.type === 'open') {
      if (hasCorrectAnswer) {
        updateData.reference_answer = referenceAnswer || null
        updateData.rubric = rubric || null
      } else {
        updateData.reference_answer = null
        updateData.rubric = null
      }
    }

    if (question.type === 'mcq') {
      const filledChoices = choices.filter(c => c.text.trim())
      if (filledChoices.length < 2) {
        setError('Please provide at least 2 choices.')
        setSaving(false)
        return
      }
      updateData.choices = filledChoices
      if (hasCorrectAnswer) {
        if (allowMultipleCorrect) {
          if (correctChoices.length < 2) {
            setError('Select at least 2 correct choices.')
            setSaving(false)
            return
          }
          updateData.correct_choice = correctChoices.join(',')
        } else {
          updateData.correct_choice = correctChoice
        }
      } else {
        updateData.correct_choice = null
      }
    }

    if (question.type === 'slider') {
      if (sliderMin >= sliderMax) {
        setError('Maximum value must be greater than minimum value.')
        setSaving(false)
        return
      }
      if (hasCorrectAnswer) {
        if (sliderCorrectValue < sliderMin || sliderCorrectValue > sliderMax) {
          setError('Correct value must be within slider range.')
          setSaving(false)
          return
        }
        if (sliderTolerance < 0) {
          setError('Tolerance must be 0 or greater.')
          setSaving(false)
          return
        }
      }
      const safeCorrectValue = Math.min(Math.max(sliderCorrectValue, sliderMin), sliderMax)
      updateData.slider_config = {
        ...sliderConfig,
        correct_value: hasCorrectAnswer ? sliderCorrectValue : safeCorrectValue,
        tolerance: hasCorrectAnswer ? sliderTolerance : 0,
      }
    }

    const { error: updateError } = await supabase
      .from('question')
      .update(updateData)
      .eq('id', question.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          initializeForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>
            Update content and session placement for this question.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-session">Session</Label>
            <select
              id="edit-session"
              value={sessionId || ''}
              onChange={(e) => setSessionId(e.target.value || null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.title}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-prompt">Prompt</Label>
            <Textarea
              id="edit-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-points">Points</Label>
            <Input
              id="edit-points"
              type="number"
              min={1}
              max={50}
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value, 10) || 1)}
              className="w-24"
            />
            {!hasCorrectAnswer && (
              <p className="text-sm text-gray-500">
                This question won&apos;t be auto-graded or count toward the score.
              </p>
            )}
          </div>

          {question.type !== 'image_map' && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <div className="space-y-0.5">
                <Label htmlFor={`edit-has-correct-${question.id}`}>Has Correct Answer</Label>
                <p className="text-sm text-gray-500">
                  Turn off to create a survey-style question.
                </p>
              </div>
              <Switch
                id={`edit-has-correct-${question.id}`}
                checked={hasCorrectAnswer}
                onCheckedChange={(checked) => {
                  setHasCorrectAnswer(checked)
                  if (!checked) {
                    setAllowMultipleCorrect(false)
                    setCorrectChoices([])
                  }
                }}
              />
            </div>
          )}

          {question.type !== 'image_map' && (
            <div className="space-y-2">
              <Label>Question Image (optional)</Label>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
            </div>
          )}

          {question.type === 'mcq' && (
            <div className="space-y-3">
              {hasCorrectAnswer && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-multi-${question.id}`}
                    checked={allowMultipleCorrect}
                    onCheckedChange={(checked) => setAllowMultipleCorrect(checked === true)}
                  />
                  <Label htmlFor={`edit-multi-${question.id}`}>Allow multiple correct answers</Label>
                </div>
              )}
              {hasCorrectAnswer && allowMultipleCorrect ? (
                <>
                  {choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`edit-choice-${question.id}-${choice.id}`}
                        checked={correctChoices.includes(choice.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCorrectChoices([...correctChoices, choice.id])
                          } else {
                            setCorrectChoices(correctChoices.filter(c => c !== choice.id))
                          }
                        }}
                      />
                      <Label htmlFor={`edit-choice-${question.id}-${choice.id}`} className="w-6">
                        {choice.id.toUpperCase()})
                      </Label>
                      <Input
                        value={choice.text}
                        onChange={(e) =>
                          setChoices(choices.map(c => (c.id === choice.id ? { ...c, text: e.target.value } : c)))
                        }
                      />
                    </div>
                  ))}
                </>
              ) : hasCorrectAnswer ? (
                <RadioGroup value={correctChoice} onValueChange={setCorrectChoice} className="space-y-2">
                  {choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-3">
                      <RadioGroupItem value={choice.id} id={`edit-choice-${question.id}-${choice.id}`} />
                      <Label htmlFor={`edit-choice-${question.id}-${choice.id}`} className="w-6">
                        {choice.id.toUpperCase()})
                      </Label>
                      <Input
                        value={choice.text}
                        onChange={(e) =>
                          setChoices(choices.map(c => (c.id === choice.id ? { ...c, text: e.target.value } : c)))
                        }
                      />
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {choices.map((choice) => (
                    <div key={choice.id} className="flex items-center gap-3">
                      <Label className="w-6">
                        {choice.id.toUpperCase()})
                      </Label>
                      <Input
                        value={choice.text}
                        onChange={(e) =>
                          setChoices(choices.map(c => (c.id === choice.id ? { ...c, text: e.target.value } : c)))
                        }
                      />
                    </div>
                  ))}
                  <p className="text-sm text-gray-500">
                    No correct answer will be stored for this question.
                  </p>
                </div>
              )}
            </div>
          )}

          {question.type === 'open' && (
            <div className="space-y-3">
              {hasCorrectAnswer ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-reference-${question.id}`}>Reference Answer</Label>
                    <Textarea
                      id={`edit-reference-${question.id}`}
                      value={referenceAnswer}
                      onChange={(e) => setReferenceAnswer(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`edit-rubric-${question.id}`}>Rubric</Label>
                    <Textarea
                      id={`edit-rubric-${question.id}`}
                      value={rubric}
                      onChange={(e) => setRubric(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  This open-ended question won&apos;t be auto-graded.
                </p>
              )}
            </div>
          )}

          {question.type === 'slider' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Min</Label>
                  <Input type="number" value={sliderMin} onChange={(e) => setSliderMin(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label>Max</Label>
                  <Input type="number" value={sliderMax} onChange={(e) => setSliderMax(parseFloat(e.target.value) || 100)} />
                </div>
                <div className="space-y-1">
                  <Label>Step</Label>
                  <Input type="number" value={sliderStep} onChange={(e) => setSliderStep(parseFloat(e.target.value) || 1)} />
                </div>
                {hasCorrectAnswer && (
                  <div className="space-y-1">
                    <Label>Tolerance (+/-)</Label>
                    <Input type="number" value={sliderTolerance} onChange={(e) => setSliderTolerance(parseFloat(e.target.value) || 0)} />
                  </div>
                )}
              </div>
              {hasCorrectAnswer ? (
                <div className="space-y-1">
                  <Label>Correct Value</Label>
                  <Input type="number" value={sliderCorrectValue} onChange={(e) => setSliderCorrectValue(parseFloat(e.target.value) || 0)} />
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Correct value is not required for ungraded slider questions.
                </p>
              )}
              <Slider
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={[sliderCorrectValue]}
                onValueChange={(v) => setSliderCorrectValue(v[0])}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
