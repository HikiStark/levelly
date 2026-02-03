'use client'

import { Question } from '@/lib/supabase/types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface MCQQuestionProps {
  question: Question
  selectedChoice: string | undefined
  onSelect: (choiceId: string) => void
}

export function MCQQuestion({ question, selectedChoice, onSelect }: MCQQuestionProps) {
  const choices = question.choices as { id: string; text: string }[] | null

  if (!choices) return null

  return (
    <div className="space-y-4">
      <p className="text-gray-900">{question.prompt}</p>
      <RadioGroup value={selectedChoice || ''} onValueChange={onSelect}>
        {choices.map((choice) => (
          <div
            key={choice.id}
            className="flex items-center space-x-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelect(choice.id)}
          >
            <RadioGroupItem value={choice.id} id={`choice-${choice.id}`} />
            <Label
              htmlFor={`choice-${choice.id}`}
              className="flex-1 cursor-pointer"
            >
              <span className="font-medium mr-2">{choice.id.toUpperCase()})</span>
              {choice.text}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
