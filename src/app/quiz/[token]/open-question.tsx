'use client'

import { Question } from '@/lib/supabase/types'
import { Textarea } from '@/components/ui/textarea'

interface OpenQuestionProps {
  question: Question
  answer: string
  onChange: (text: string) => void
}

export function OpenQuestion({ question, answer, onChange }: OpenQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-gray-900">{question.prompt}</p>
      <Textarea
        placeholder="Type your answer here..."
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="resize-none"
      />
    </div>
  )
}
