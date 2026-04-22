'use client'

import { useTranslations } from 'next-intl'
import { Question, LikertConfig } from '@/lib/supabase/types'

interface LikertQuestionProps {
  question: Question
  value: number | undefined
  onChange: (value: number) => void
}

export function LikertQuestion({ question, value, onChange }: LikertQuestionProps) {
  const t = useTranslations('quiz')
  const config = question.likert_config as LikertConfig | null

  if (!config || !config.scale || config.scale < 2) {
    return (
      <div className="space-y-4">
        <p className="text-gray-900">{question.prompt}</p>
        <p className="text-red-500">{t('likertMissing')}</p>
      </div>
    )
  }

  const points = Array.from({ length: config.scale }, (_, i) => i + 1)
  const getLabel = (point: number): string | null => {
    if (config.labels && config.labels[point - 1]) return config.labels[point - 1]
    if (point === 1 && config.min_label) return config.min_label
    if (point === config.scale && config.max_label) return config.max_label
    return null
  }

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

      <div className="flex items-stretch justify-between gap-2">
        {points.map((point) => {
          const label = getLabel(point)
          const isSelected = value === point
          return (
            <button
              key={point}
              type="button"
              onClick={() => onChange(point)}
              className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm transition ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-400'
                }`}
              >
                {point}
              </span>
              {label && (
                <span className="text-xs text-center leading-tight">{label}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
