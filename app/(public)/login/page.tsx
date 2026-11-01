import { Suspense } from 'react'
import AuthFrame from '@/components/layout/AuthFrame'
import LoginForm from './_components/LoginForm'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <AuthFrame title="Sign in" description="Welcome back. Use the email you registered with.">
      <Suspense fallback={<div className="h-56" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  )
}
