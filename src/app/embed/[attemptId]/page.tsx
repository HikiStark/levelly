'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface EmbedData {
  embedCode: string
  level: string
  assignmentTitle: string
}

export default function EmbedPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = use(params)
  const [data, setData] = useState<EmbedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useTranslations('embed')

  useEffect(() => {
    const fetchEmbed = async () => {
      try {
        const response = await fetch(`/api/embed/${attemptId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || t('notFound'))
        }

        setData(result)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('notFound'))
        setLoading(false)
      }
    }

    fetchEmbed()
  }, [attemptId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || t('notFound')}</p>
            <Button
              className="mt-4"
              onClick={() => router.push(`/results/${attemptId}`)}
            >
              {t('backToResults')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const levelDisplay = data.level.charAt(0).toUpperCase() + data.level.slice(1)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Header */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => router.push(`/results/${attemptId}`)}
          >
            &larr; {t('backToResults')}
          </Button>
        </div>

        {/* Embed Content Container */}
        <Card>
          <CardHeader>
              <CardTitle className="text-lg">
                {t('title', { level: levelDisplay })}
              </CardTitle>
          </CardHeader>
          <CardContent>
            <EmbedRenderer htmlContent={data.embedCode} />
          </CardContent>
        </Card>

        {/* Bottom Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => router.push(`/results/${attemptId}`)}
          >
            &larr; {t('backToResults')}
          </Button>
          <p className="text-sm text-gray-500">
            {t('returnNote')}
          </p>
        </div>
      </div>
    </div>
  )
}

// Separate component for embed rendering with proper script execution
function EmbedRenderer({ htmlContent }: { htmlContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous content
    containerRef.current.innerHTML = ''

    // Create a temporary container to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = htmlContent

    // Extract scripts for later execution
    const scripts = temp.querySelectorAll('script')
    const fragment = document.createDocumentFragment()

    // Add non-script content first
    Array.from(temp.childNodes).forEach((node) => {
      if (node.nodeName !== 'SCRIPT') {
        fragment.appendChild(node.cloneNode(true))
      }
    })
    containerRef.current.appendChild(fragment)

    // Execute scripts after content is added
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script')
      if (oldScript.src) {
        newScript.src = oldScript.src
      } else {
        newScript.textContent = oldScript.textContent
      }
      // Copy attributes (charset, type, etc.)
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
      className="embed-container min-h-[400px]"
    />
  )
}
