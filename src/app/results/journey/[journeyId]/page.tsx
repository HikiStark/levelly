'use client'

import { useEffect, useRef, useState, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLevelDisplayName, getLevelColor, Level } from '@/lib/grading/level-calculator'

interface JourneySummaryResponse {
  journey: {
    id: string
    overall_status: 'in_progress' | 'completed'
  }
  assignment: {
    title: string
    description: string | null
  }
  sessionResults: {
    session: { id: string; title: string; order_index: number; description: string | null }
    attempt: {
      id: string
      total_score: number
      max_score: number
      level: string | null
      is_final: boolean
    } | null
    score: number
    maxScore: number
    level: string | null
    isComplete: boolean
  }[]
  summary: {
    totalScore: number
    maxScore: number
    percentage: number
    overallLevel: string
    completedSessions: number
    totalSessions: number
  }
  finalRedirect: { type: 'link' | 'embed'; url?: string; embedCode?: string } | null
}

export default function JourneyResultsPage({
  params,
}: {
  params: Promise<{ journeyId: string }>
}) {
  const { journeyId } = use(params)
  const [data, setData] = useState<JourneySummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`/api/journey/${journeyId}/summary`)
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load journey summary')
        }
        setData(result)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load journey summary')
        setLoading(false)
      }
    }
    fetchSummary()
  }, [journeyId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading journey summary...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || 'Summary not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const level = data.summary.overallLevel as Level

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{data.assignment.title} - Overall Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-2">Overall Level</p>
              <Badge className={`text-xl px-6 py-2 ${getLevelColor(level)} text-white`}>
                {getLevelDisplayName(level)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-md">
                <p className="text-3xl font-bold text-gray-900">{data.summary.percentage}%</p>
                <p className="text-sm text-gray-500">Overall Score</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-md">
                <p className="text-3xl font-bold text-gray-900">
                  {data.summary.totalScore}/{data.summary.maxScore}
                </p>
                <p className="text-sm text-gray-500">Points</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Completed {data.summary.completedSessions} of {data.summary.totalSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.sessionResults.map((result, index) => (
              <div key={result.session.id} className="border rounded-md p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {index + 1}. {result.session.title}
                    </p>
                    {result.session.description && (
                      <p className="text-sm text-gray-500">{result.session.description}</p>
                    )}
                  </div>
                  <Badge
                    variant={result.isComplete ? 'default' : 'secondary'}
                  >
                    {result.isComplete ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Score: {result.score}/{result.maxScore}
                </div>
                {result.level && (
                  <div className="text-sm text-gray-600">
                    Level: {getLevelDisplayName(result.level as Level)}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {data.finalRedirect && (
          <Card>
            <CardHeader>
              <CardTitle>Final Learning Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.finalRedirect.type === 'link' && data.finalRedirect.url ? (
                <Button onClick={() => window.open(data.finalRedirect?.url, '_blank')}>
                  Open Learning Content
                </Button>
              ) : data.finalRedirect.type === 'embed' && data.finalRedirect.embedCode ? (
                <div className="border rounded-lg p-4 bg-white">
                  <EmbedRenderer htmlContent={data.finalRedirect.embedCode} />
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function EmbedRenderer({ htmlContent }: { htmlContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const temp = document.createElement('div')
    temp.innerHTML = htmlContent

    const scripts = temp.querySelectorAll('script')
    const fragment = document.createDocumentFragment()

    Array.from(temp.childNodes).forEach((node) => {
      if (node.nodeName !== 'SCRIPT') {
        fragment.appendChild(node.cloneNode(true))
      }
    })
    containerRef.current.appendChild(fragment)

    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script')
      if (oldScript.src) {
        newScript.src = oldScript.src
      } else {
        newScript.textContent = oldScript.textContent
      }
      Array.from(oldScript.attributes).forEach((attr) => {
        if (attr.name !== 'src') {
          newScript.setAttribute(attr.name, attr.value)
        }
      })
      containerRef.current?.appendChild(newScript)
    })
  }, [htmlContent])

  return (
    <div
      ref={containerRef}
      className="embed-container min-h-[200px]"
    />
  )
}
