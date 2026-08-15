import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SignupForm from './_components/SignupForm'

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center min-h-[75vh] px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Join the Solar Intelligence Platform to build your solar profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  )
}
