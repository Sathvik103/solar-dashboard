import AuthFrame from '@/components/layout/AuthFrame'
import SignupForm from './_components/SignupForm'

export const metadata = { title: 'Create account' }

export default function SignupPage() {
  return (
    <AuthFrame title="Create an account" description="Free. Your readings and bills stay private to your account.">
      <SignupForm />
    </AuthFrame>
  )
}
