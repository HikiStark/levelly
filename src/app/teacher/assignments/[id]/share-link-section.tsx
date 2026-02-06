'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { ShareLink } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ShareLinkSectionProps {
  assignmentId: string
  shareLinks: ShareLink[]
  isPublished: boolean
}

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function ShareLinkSection({ assignmentId, shareLinks, isPublished }: ShareLinkSectionProps) {
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('shareLinks')

  const generateLink = async () => {
    setGenerating(true)

    const token = generateToken()
    const { error } = await supabase
      .from('share_link')
      .insert({
        assignment_id: assignmentId,
        token,
        is_active: true,
      })

    if (error) {
      alert(`${t('errorGenerating')}: ${error.message}`)
    }

    setGenerating(false)
    router.refresh()
  }

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/quiz/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const deactivateLink = async (linkId: string) => {
    const { error } = await supabase
      .from('share_link')
      .update({ is_active: false })
      .eq('id', linkId)

    if (error) {
      alert(`${t('errorDeactivating')}: ${error.message}`)
    }

    router.refresh()
  }

  if (!isPublished) {
    return (
      <p className="text-gray-500">
        {t('publishFirst')}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <Button onClick={generateLink} disabled={generating}>
        {generating ? t('generating') : t('generateNew')}
      </Button>

      {shareLinks.length === 0 ? (
        <p className="text-gray-500">{t('noActive')}</p>
      ) : (
        <div className="space-y-3">
          {shareLinks.map((link) => {
            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/quiz/${link.token}`
            return (
              <div key={link.id} className="flex items-center gap-3">
                <Input
                  value={url}
                  readOnly
                  className="flex-1 bg-gray-50"
                />
                <Button
                  variant="outline"
                  onClick={() => copyLink(link.token)}
                >
                  {copied === link.token ? t('copied') : t('copy')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => deactivateLink(link.id)}
                >
                  {t('deactivate')}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
