'use client'

import { Question } from '@/lib/supabase/types'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface MCQQuestionProps {
  question: Question
  selectedChoice: string | undefined
  onSelect: (choiceId: string) => void
  onMultiSelect?: (choiceIds: string[]) => void
}

export function MCQQuestion({ question, selectedChoice, onSelect, onMultiSelect }: MCQQuestionProps) {
  const choices = question.choices as { id: string; text: string }[] | null

  // Detect if this is a multi-answer question by checking if correct_choice contains a comma
  const isMultiAnswer = question.correct_choice?.includes(',') ?? false

  // Parse selected choices for multi-answer questions
  const selectedChoices = selectedChoice?.split(',').filter(Boolean) || []

  if (!choices) return null

  if (isMultiAnswer) {
    const handleCheckboxChange = (choiceId: string, checked: boolean) => {
      let newSelection: string[]
      if (checked) {
        newSelection = [...selectedChoices, choiceId]
      } else {
        newSelection = selectedChoices.filter(id => id !== choiceId)
      }

      if (onMultiSelect) {
        onMultiSelect(newSelection)
      } else {
        // Fallback: use onSelect with comma-separated values
        onSelect(newSelection.join(','))
      }
    }

    return (
      <div className="space-y-4">
        <p className="text-gray-900">{question.prompt}</p>
        <p className="text-sm text-blue-600">Select all correct answers</p>
        <div className="space-y-2">
          {choices.map((choice) => (
            <div
              key={choice.id}
              className="flex items-center space-x-3 p-3 rounded-md hover:bg-gray-50 cursor-pointer"
              onClick={() => handleCheckboxChange(choice.id, !selectedChoices.includes(choice.id))}
            >
              <Checkbox
                id={`choice-${question.id}-${choice.id}`}
                checked={selectedChoices.includes(choice.id)}
                onCheckedChange={(checked) => handleCheckboxChange(choice.id, checked === true)}
              />
              <Label
                htmlFor={`choice-${question.id}-${choice.id}`}
                className="flex-1 cursor-pointer"
              >
                <span className="font-medium mr-2">{choice.id.toUpperCase()})</span>
                {choice.text}
              </Label>
            </div>
          ))}
        </div>
      </div>
    )
  }

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
            <RadioGroupItem value={choice.id} id={`choice-${question.id}-${choice.id}`} />
            <Label
              htmlFor={`choice-${question.id}-${choice.id}`}
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
