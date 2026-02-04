'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Question, SliderConfig, ImageMapConfig } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

interface QuestionListProps {
  questions: Question[]
  assignmentId: string
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'mcq':
      return { label: 'MCQ', variant: 'default' as const }
    case 'open':
      return { label: 'Open', variant: 'secondary' as const }
    case 'slider':
      return { label: 'Slider', variant: 'outline' as const }
    case 'image_map':
      return { label: 'Image Map', variant: 'outline' as const }
    default:
      return { label: type, variant: 'secondary' as const }
  }
}

export function QuestionList({ questions, assignmentId }: QuestionListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    setDeleting(questionId)

    const { error } = await supabase
      .from('question')
      .delete()
      .eq('id', questionId)

    if (error) {
      alert('Error deleting question: ' + error.message)
    }

    setDeleting(null)
    router.refresh()
  }

  if (questions.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No questions yet. Add your first question above.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const typeBadge = getTypeBadge(question.type)
        const sliderConfig = question.slider_config as SliderConfig | null
        const imageMapConfig = question.image_map_config as ImageMapConfig | null

        return (
          <Card key={question.id}>
            <CardContent className="py-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      Q{index + 1}
                    </span>
                    <Badge variant={typeBadge.variant}>
                      {typeBadge.label}
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {question.points} point{question.points !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Question Image (if present) */}
                  {question.image_url && question.type !== 'image_map' && (
                    <img
                      src={question.image_url}
                      alt="Question image"
                      className="max-w-xs h-auto rounded-lg mb-2"
                    />
                  )}

                  <p className="text-gray-900 mb-2">{question.prompt}</p>

                  {/* MCQ Details */}
                  {question.type === 'mcq' && question.choices && (
                    <div className="space-y-1 ml-4">
                      {(() => {
                        const correctChoices = question.correct_choice?.split(',').map(c => c.trim()) || []
                        const isMultipleCorrect = correctChoices.length > 1
                        return (
                          <>
                            {isMultipleCorrect && (
                              <p className="text-xs text-blue-600 mb-1">
                                Multiple correct answers (select all)
                              </p>
                            )}
                            {(question.choices as { id: string; text: string }[]).map((choice) => {
                              const isCorrect = correctChoices.includes(choice.id)
                              return (
                                <p
                                  key={choice.id}
                                  className={`text-sm ${
                                    isCorrect
                                      ? 'text-green-600 font-medium'
                                      : 'text-gray-600'
                                  }`}
                                >
                                  {choice.id.toUpperCase()}) {choice.text}
                                  {isCorrect && ' ✓'}
                                </p>
                              )
                            })}
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {/* Open Answer Details */}
                  {question.type === 'open' && question.reference_answer && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">Reference:</span>{' '}
                      {question.reference_answer.substring(0, 100)}
                      {question.reference_answer.length > 100 && '...'}
                    </p>
                  )}

                  {/* Slider Details */}
                  {question.type === 'slider' && sliderConfig && (
                    <div className="text-sm text-gray-500 mt-2 space-y-1">
                      <p>
                        <span className="font-medium">Range:</span> {sliderConfig.min} - {sliderConfig.max}
                        {sliderConfig.step !== 1 && ` (step: ${sliderConfig.step})`}
                      </p>
                      <p>
                        <span className="font-medium">Correct:</span> {sliderConfig.correct_value}
                        {sliderConfig.tolerance > 0 && ` (±${sliderConfig.tolerance})`}
                      </p>
                    </div>
                  )}

                  {/* Image Map Details */}
                  {question.type === 'image_map' && imageMapConfig && (
                    <div className="mt-2">
                      <div className="relative inline-block">
                        <img
                          src={imageMapConfig.base_image_url}
                          alt="Image map"
                          className="max-w-xs h-auto rounded-lg"
                        />
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {imageMapConfig.flags.length} flag{imageMapConfig.flags.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mt-2">
                        {imageMapConfig.flags.map((flag, i) => (
                          <span key={flag.id} className="inline-block mr-2">
                            {flag.label} ({flag.answer_type}, {flag.points}pt)
                            {i < imageMapConfig.flags.length - 1 && ','}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(question.id)}
                  disabled={deleting === question.id}
                >
                  {deleting === question.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
