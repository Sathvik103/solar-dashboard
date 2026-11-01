import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/dal/users'
import AuthFrame from '@/components/layout/AuthFrame'
import SignupForm from './_components/SignupForm'

export const metadata = {
  title: 'Create account',
  description: 'Create a free SolarIntel account to size, price and monitor a rooftop solar system in Telangana.',
  alternates: { canonical: '/signup' },
}

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/dashboard')
  return (
    <AuthFrame title="Create an account" description="Free. Your readings and bills stay private to your account.">
      <SignupForm />
    </AuthFrame>
  )
}
