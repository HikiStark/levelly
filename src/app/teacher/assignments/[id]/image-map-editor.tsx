'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { ImageMapFlag, ImageMapConfig, SliderConfig, Question, Session } from '@/lib/supabase/types'
import { MapPin, Trash2, Settings, Plus } from 'lucide-react'

interface ImageMapEditorProps {
  assignmentId: string
  questions: Question[]
}

interface FlagFormData {
  label: string
  answer_type: 'text' | 'mcq' | 'slider'
  correct_answer: string
  choices: { id: string; text: string }[]
  slider_config: SliderConfig
  reference_answer: string
  points: number
}

const defaultSliderConfig: SliderConfig = {
  min: 0,
  max: 100,
  step: 1,
  correct_value: 50,
  tolerance: 5,
}

const defaultFlagForm: FlagFormData = {
  label: '',
  answer_type: 'text',
  correct_answer: '',
  choices: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ],
  slider_config: { ...defaultSliderConfig },
  reference_answer: '',
  points: 1,
}

export function ImageMapEditor({ assignmentId, questions }: ImageMapEditorProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null)
  const [flags, setFlags] = useState<ImageMapFlag[]>([])
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null)
  const [flagFormOpen, setFlagFormOpen] = useState(false)
  const [flagForm, setFlagForm] = useState<FlagFormData>({ ...defaultFlagForm })
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageContainerRef = useRef<HTMLDivElement>(null)
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
    setPrompt('')
    setBaseImageUrl(null)
    setFlags([])
    setSelectedFlagId(null)
    setFlagFormOpen(false)
    setFlagForm({ ...defaultFlagForm })
    setEditingFlagId(null)
    setSelectedSessionId(null)
    setError(null)
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!baseImageUrl) return

    const container = imageContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Create new flag at click position
    const newFlag: ImageMapFlag = {
      id: `flag-${Date.now()}`,
      x,
      y,
      label: `Point ${flags.length + 1}`,
      answer_type: 'text',
      correct_answer: '',
      points: 1,
    }

    setFlags([...flags, newFlag])
    setEditingFlagId(newFlag.id)
    setFlagForm({
      ...defaultFlagForm,
      label: newFlag.label,
    })
    setFlagFormOpen(true)
  }

  const handleFlagDrag = (flagId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const container = imageContainerRef.current
    if (!container) return

    const startX = e.clientX
    const startY = e.clientY
    const flag = flags.find(f => f.id === flagId)
    if (!flag) return

    const rect = container.getBoundingClientRect()
    const startFlagX = flag.x
    const startFlagY = flag.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / rect.width
      const deltaY = (moveEvent.clientY - startY) / rect.height

      const newX = Math.max(0, Math.min(1, startFlagX + deltaX))
      const newY = Math.max(0, Math.min(1, startFlagY + deltaY))

      setFlags(flags.map(f =>
        f.id === flagId ? { ...f, x: newX, y: newY } : f
      ))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleEditFlag = (flagId: string) => {
    const flag = flags.find(f => f.id === flagId)
    if (!flag) return

    setEditingFlagId(flagId)
    setFlagForm({
      label: flag.label,
      answer_type: flag.answer_type,
      correct_answer: flag.correct_answer,
      choices: flag.choices || [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ],
      slider_config: flag.slider_config || { ...defaultSliderConfig },
      reference_answer: flag.reference_answer || '',
      points: flag.points,
    })
    setFlagFormOpen(true)
  }

  const handleDeleteFlag = (flagId: string) => {
    setFlags(flags.filter(f => f.id !== flagId))
    if (selectedFlagId === flagId) {
      setSelectedFlagId(null)
    }
  }

  const handleSaveFlag = () => {
    if (!editingFlagId) return

    setFlags(flags.map(f => {
      if (f.id !== editingFlagId) return f

      const updatedFlag: ImageMapFlag = {
        ...f,
        label: flagForm.label,
        answer_type: flagForm.answer_type,
        correct_answer: flagForm.correct_answer,
        points: flagForm.points,
      }

      if (flagForm.answer_type === 'mcq') {
        updatedFlag.choices = flagForm.choices.filter(c => c.text.trim())
      }
      if (flagForm.answer_type === 'slider') {
        updatedFlag.slider_config = flagForm.slider_config
        updatedFlag.correct_answer = String(flagForm.slider_config.correct_value)
      }
      if (flagForm.answer_type === 'text') {
        updatedFlag.reference_answer = flagForm.reference_answer
      }

      return updatedFlag
    }))

    setFlagFormOpen(false)
    setEditingFlagId(null)
    setFlagForm({ ...defaultFlagForm })
  }

  const getTotalPoints = () => {
    return flags.reduce((sum, f) => sum + f.points, 0)
  }

  const getNextOrderIndex = (sessionId: string | null) => {
    const relevant = questions.filter(q => (q.session_id || null) === sessionId)
    const maxIndex = relevant.reduce((max, q) => Math.max(max, q.order_index), -1)
    return maxIndex + 1
  }

  const handleSubmit = async () => {
    setError(null)

    if (!prompt.trim()) {
      setError('Please enter a question prompt')
      return
    }

    if (!baseImageUrl) {
      setError('Please upload a base image')
      return
    }

    if (flags.length === 0) {
      setError('Please add at least one flag to the image')
      return
    }

    // Validate flags
    for (const flag of flags) {
      if (!flag.label.trim()) {
        setError(`Flag is missing a label`)
        return
      }
      if (flag.answer_type === 'mcq') {
        const filledChoices = flag.choices?.filter(c => c.text.trim()) || []
        if (filledChoices.length < 2) {
          setError(`Flag "${flag.label}" needs at least 2 MCQ choices`)
          return
        }
        if (!flag.correct_answer) {
          setError(`Flag "${flag.label}" is missing a correct answer`)
          return
        }
      }
      if (flag.answer_type === 'text' && !flag.correct_answer && !flag.reference_answer) {
        setError(`Flag "${flag.label}" needs a correct answer or reference answer`)
        return
      }
    }

    setLoading(true)

    const imageMapConfig: ImageMapConfig = {
      base_image_url: baseImageUrl,
      flags: flags,
    }

    const { error: insertError } = await supabase
      .from('question')
      .insert({
        assignment_id: assignmentId,
        session_id: selectedSessionId,
        type: 'image_map',
        prompt,
        points: getTotalPoints(),
        order_index: getNextOrderIndex(selectedSessionId),
        image_map_config: imageMapConfig,
      })

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
    setFlagForm({
      ...flagForm,
      choices: flagForm.choices.map(c => (c.id === id ? { ...c, text } : c)),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MapPin className="mr-2 h-4 w-4" />
          Add Image Map Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Image Map Question</DialogTitle>
          <DialogDescription>
            Upload an image and place clickable flags for students to answer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {/* Question Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Question</Label>
            <Textarea
              id="prompt"
              placeholder="Enter your question here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
            />
          </div>

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

          {/* Base Image Upload */}
          <div className="space-y-2">
            <Label>Base Image</Label>
            <ImageUpload
              value={baseImageUrl}
              onChange={setBaseImageUrl}
            />
          </div>

          {/* Image with Flags */}
          {baseImageUrl && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Click on the image to place flags</Label>
                <span className="text-sm text-gray-500">
                  Total Points: {getTotalPoints()}
                </span>
              </div>
              <div
                ref={imageContainerRef}
                className="relative border rounded-lg overflow-hidden cursor-crosshair"
                onClick={handleImageClick}
              >
                <img
                  src={baseImageUrl}
                  alt="Base image"
                  className="w-full h-auto"
                  draggable={false}
                />
                {/* Flags */}
                {flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="absolute transform -translate-x-1/2 -translate-y-full"
                    style={{ left: `${flag.x * 100}%`, top: `${flag.y * 100}%` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className={`
                        flex flex-col items-center cursor-move
                        ${selectedFlagId === flag.id ? 'z-20' : 'z-10'}
                      `}
                      onMouseDown={(e) => handleFlagDrag(flag.id, e)}
                    >
                      <div className="flex gap-1 mb-1">
                        <button
                          className="p-1 bg-white rounded shadow hover:bg-gray-100"
                          onClick={() => handleEditFlag(flag.id)}
                        >
                          <Settings className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 bg-white rounded shadow hover:bg-red-100"
                          onClick={() => handleDeleteFlag(flag.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                      <div className="bg-blue-600 text-white px-2 py-1 rounded-t text-xs font-medium whitespace-nowrap">
                        {flag.label} ({flag.points}pt)
                      </div>
                      <MapPin className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flags List */}
          {flags.length > 0 && (
            <div className="space-y-2">
              <Label>Flags ({flags.length})</Label>
              <div className="grid gap-2">
                {flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div>
                      <span className="font-medium">{flag.label}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({flag.answer_type}, {flag.points} pt)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditFlag(flag.id)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteFlag(flag.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Question'}
            </Button>
          </div>
        </div>

        {/* Flag Edit Dialog */}
        <Dialog open={flagFormOpen} onOpenChange={setFlagFormOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configure Flag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flagLabel">Label</Label>
                <Input
                  id="flagLabel"
                  value={flagForm.label}
                  onChange={(e) => setFlagForm({ ...flagForm, label: e.target.value })}
                  placeholder="e.g., Point A, Capital City, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flagPoints">Points</Label>
                <Input
                  id="flagPoints"
                  type="number"
                  min={1}
                  max={10}
                  value={flagForm.points}
                  onChange={(e) => setFlagForm({ ...flagForm, points: parseInt(e.target.value) || 1 })}
                  className="w-24"
                />
              </div>

              <div className="space-y-2">
                <Label>Answer Type</Label>
                <RadioGroup
                  value={flagForm.answer_type}
                  onValueChange={(v) => setFlagForm({ ...flagForm, answer_type: v as 'text' | 'mcq' | 'slider' })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="flag-text" />
                    <Label htmlFor="flag-text" className="cursor-pointer">Text</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mcq" id="flag-mcq" />
                    <Label htmlFor="flag-mcq" className="cursor-pointer">MCQ</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="slider" id="flag-slider" />
                    <Label htmlFor="flag-slider" className="cursor-pointer">Slider</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Text Answer Fields */}
              {flagForm.answer_type === 'text' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="correctAnswer">Correct Answer</Label>
                    <Input
                      id="correctAnswer"
                      value={flagForm.correct_answer}
                      onChange={(e) => setFlagForm({ ...flagForm, correct_answer: e.target.value })}
                      placeholder="Exact answer for simple matching"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referenceAnswer">Reference Answer (for AI grading)</Label>
                    <Textarea
                      id="referenceAnswer"
                      value={flagForm.reference_answer}
                      onChange={(e) => setFlagForm({ ...flagForm, reference_answer: e.target.value })}
                      placeholder="More detailed answer for AI grading comparison"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* MCQ Answer Fields */}
              {flagForm.answer_type === 'mcq' && (
                <div className="space-y-4">
                  <Label>Choices</Label>
                  <RadioGroup
                    value={flagForm.correct_answer}
                    onValueChange={(v) => setFlagForm({ ...flagForm, correct_answer: v })}
                    className="space-y-2"
                  >
                    {flagForm.choices.map((choice) => (
                      <div key={choice.id} className="flex items-center gap-2">
                        <RadioGroupItem value={choice.id} id={`choice-${choice.id}`} />
                        <Label htmlFor={`choice-${choice.id}`} className="w-6">
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
                </div>
              )}

              {/* Slider Answer Fields */}
              {flagForm.answer_type === 'slider' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min</Label>
                      <Input
                        type="number"
                        value={flagForm.slider_config.min}
                        onChange={(e) => setFlagForm({
                          ...flagForm,
                          slider_config: { ...flagForm.slider_config, min: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max</Label>
                      <Input
                        type="number"
                        value={flagForm.slider_config.max}
                        onChange={(e) => setFlagForm({
                          ...flagForm,
                          slider_config: { ...flagForm.slider_config, max: parseFloat(e.target.value) || 100 }
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Step</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={flagForm.slider_config.step}
                        onChange={(e) => setFlagForm({
                          ...flagForm,
                          slider_config: { ...flagForm.slider_config, step: parseFloat(e.target.value) || 1 }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tolerance (±)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={flagForm.slider_config.tolerance}
                        onChange={(e) => setFlagForm({
                          ...flagForm,
                          slider_config: { ...flagForm.slider_config, tolerance: parseFloat(e.target.value) || 0 }
                        })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Correct Value</Label>
                    <Input
                      type="number"
                      value={flagForm.slider_config.correct_value}
                      onChange={(e) => setFlagForm({
                        ...flagForm,
                        slider_config: { ...flagForm.slider_config, correct_value: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-2 p-3 bg-gray-50 rounded">
                    <Label>Preview</Label>
                    <Slider
                      min={flagForm.slider_config.min}
                      max={flagForm.slider_config.max}
                      step={flagForm.slider_config.step}
                      value={[flagForm.slider_config.correct_value]}
                      onValueChange={(v) => setFlagForm({
                        ...flagForm,
                        slider_config: { ...flagForm.slider_config, correct_value: v[0] }
                      })}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setFlagFormOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFlag}>
                  Save Flag
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
