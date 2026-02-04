'use client'

import { useState } from 'react'
import { Question, ImageMapConfig, ImageMapFlag, SliderConfig } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MapPin, Check } from 'lucide-react'

interface ImageMapQuestionProps {
  question: Question
  answers: Record<string, string>
  onAnswerChange: (flagId: string, answer: string) => void
}

export function ImageMapQuestion({ question, answers, onAnswerChange }: ImageMapQuestionProps) {
  const [selectedFlag, setSelectedFlag] = useState<ImageMapFlag | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tempAnswer, setTempAnswer] = useState('')
  const [tempSliderValue, setTempSliderValue] = useState(50)

  const config = question.image_map_config as ImageMapConfig | null

  if (!config) {
    return (
      <div className="space-y-4">
        <p className="text-gray-900">{question.prompt}</p>
        <p className="text-red-500">Error: Image map configuration is missing</p>
      </div>
    )
  }

  const handleFlagClick = (flag: ImageMapFlag) => {
    setSelectedFlag(flag)
    const existingAnswer = answers[flag.id] || ''
    setTempAnswer(existingAnswer)

    if (flag.answer_type === 'slider' && flag.slider_config) {
      setTempSliderValue(
        existingAnswer ? parseFloat(existingAnswer) : flag.slider_config.min
      )
    }

    setDialogOpen(true)
  }

  const handleSaveAnswer = () => {
    if (!selectedFlag) return

    if (selectedFlag.answer_type === 'slider') {
      onAnswerChange(selectedFlag.id, String(tempSliderValue))
    } else {
      onAnswerChange(selectedFlag.id, tempAnswer)
    }

    setDialogOpen(false)
    setSelectedFlag(null)
    setTempAnswer('')
  }

  const isAnswered = (flagId: string) => {
    return !!answers[flagId] && answers[flagId].trim() !== ''
  }

  const getAnsweredCount = () => {
    return config.flags.filter(f => isAnswered(f.id)).length
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-900">{question.prompt}</p>

      <div className="flex justify-between text-sm text-gray-500">
        <span>Click on the flags to answer</span>
        <span>{getAnsweredCount()}/{config.flags.length} answered</span>
      </div>

      {/* Image with flags */}
      <div className="relative border rounded-lg overflow-hidden">
        <img
          src={config.base_image_url}
          alt="Question image"
          className="w-full h-auto"
          draggable={false}
        />
        {/* Flags */}
        {config.flags.map((flag) => (
          <div
            key={flag.id}
            className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer"
            style={{ left: `${flag.x * 100}%`, top: `${flag.y * 100}%` }}
            onClick={() => handleFlagClick(flag)}
          >
            <div className="flex flex-col items-center group">
              <div
                className={`
                  px-2 py-1 rounded-t text-xs font-medium whitespace-nowrap
                  transition-colors
                  ${isAnswered(flag.id)
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white group-hover:bg-blue-700'
                  }
                `}
              >
                {flag.label}
                {isAnswered(flag.id) && <Check className="inline-block ml-1 h-3 w-3" />}
              </div>
              <MapPin
                className={`h-6 w-6 ${
                  isAnswered(flag.id) ? 'text-green-600' : 'text-blue-600'
                }`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Answer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedFlag?.label}</DialogTitle>
          </DialogHeader>

          {selectedFlag && (
            <div className="space-y-4 pt-2">
              {/* Text Input */}
              {selectedFlag.answer_type === 'text' && (
                <div className="space-y-2">
                  <Label>Your Answer</Label>
                  <Input
                    value={tempAnswer}
                    onChange={(e) => setTempAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    autoFocus
                  />
                </div>
              )}

              {/* MCQ Input */}
              {selectedFlag.answer_type === 'mcq' && selectedFlag.choices && (
                <div className="space-y-2">
                  <Label>Select your answer</Label>
                  <RadioGroup
                    value={tempAnswer}
                    onValueChange={setTempAnswer}
                    className="space-y-2"
                  >
                    {selectedFlag.choices.map((choice) => (
                      <div
                        key={choice.id}
                        className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                        onClick={() => setTempAnswer(choice.id)}
                      >
                        <RadioGroupItem value={choice.id} id={`flag-choice-${choice.id}`} />
                        <Label
                          htmlFor={`flag-choice-${choice.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium mr-2">{choice.id.toUpperCase()})</span>
                          {choice.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Slider Input */}
              {selectedFlag.answer_type === 'slider' && selectedFlag.slider_config && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{selectedFlag.slider_config.min}</span>
                    <span className="font-medium text-lg text-gray-900">{tempSliderValue}</span>
                    <span>{selectedFlag.slider_config.max}</span>
                  </div>
                  <Slider
                    min={selectedFlag.slider_config.min}
                    max={selectedFlag.slider_config.max}
                    step={selectedFlag.slider_config.step}
                    value={[tempSliderValue]}
                    onValueChange={(v) => setTempSliderValue(v[0])}
                    className="w-full"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAnswer}>
                  Save Answer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
