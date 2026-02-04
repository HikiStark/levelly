'use client'

import { Question, SliderConfig } from '@/lib/supabase/types'
import { Slider } from '@/components/ui/slider'

interface SliderQuestionProps {
  question: Question
  value: number | undefined
  onChange: (value: number) => void
}

export function SliderQuestion({ question, value, onChange }: SliderQuestionProps) {
  const config = question.slider_config as SliderConfig | null

  if (!config) {
    return (
      <div className="space-y-4">
        <p className="text-gray-900">{question.prompt}</p>
        <p className="text-red-500">Error: Slider configuration is missing</p>
      </div>
    )
  }

  const currentValue = value ?? config.min

  return (
    <div className="space-y-4">
      {question.image_url && (
        <div className="mb-4">
          <img
            src={question.image_url}
            alt="Question image"
            className="max-w-full h-auto rounded-lg"
          />
        </div>
      )}
      <p className="text-gray-900">{question.prompt}</p>
      <div className="space-y-4 pt-4">
        <div className="flex justify-between text-sm text-gray-500">
          <span>{config.min}</span>
          <span className="font-medium text-lg text-gray-900">{currentValue}</span>
          <span>{config.max}</span>
        </div>
        <Slider
          min={config.min}
          max={config.max}
          step={config.step}
          value={[currentValue]}
          onValueChange={(values) => onChange(values[0])}
          className="w-full"
        />
        <p className="text-sm text-gray-500 text-center">
          Drag the slider to select your answer
        </p>
      </div>
    </div>
  )
}
