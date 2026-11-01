import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/dal/users'
import AuthFrame from '@/components/layout/AuthFrame'
import LoginForm from './_components/LoginForm'

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to SolarIntel to see your solar output, savings and devices.',
  alternates: { canonical: '/login' },
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard')
  return (
    <AuthFrame title="Sign in" description="Welcome back. Use the email you registered with.">
      <Suspense fallback={<div className="h-56" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  )
}
