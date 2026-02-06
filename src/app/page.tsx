import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from '@/components/language-toggle'
import { getTranslations } from 'next-intl/server'

export default async function Home() {
  const t = await getTranslations('landing')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('title')}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {t('subtitle')}
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg">{t('signIn')}</Button>
          </Link>
          <Link href="/signup">
            <Button size="lg" variant="outline">{t('createAccount')}</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
