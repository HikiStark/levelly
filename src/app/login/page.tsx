'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageToggle } from '@/components/language-toggle'
import { useTranslations } from 'next-intl'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('auth.login')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Save consent to database
    if (data.user) {
      await supabase
        .from('teacher')
        .update({
          data_consent_given: true,
          data_consent_timestamp: new Date().toISOString(),
        })
        .eq('user_id', data.user.id)
    }

    router.push('/teacher')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:flex sm:items-center sm:justify-center relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="mx-auto w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
              />
              <Label
                htmlFor="consent"
                className="text-sm text-gray-600 leading-relaxed cursor-pointer"
              >
                {t('consent')}
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading || !consentGiven}>
              {loading ? t('submitting') : t('submit')}
            </Button>
            <p className="text-sm text-gray-600">
              {t('noAccount')}{' '}
              <Link href="/signup" className="text-blue-600 hover:underline">
                {t('signUpLink')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
