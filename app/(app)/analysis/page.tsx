import { getCurrentUser } from '@/lib/dal/users'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import SolarAnalysisStudio from './_components/SolarAnalysisStudio'

export const metadata = {
  title: 'Solar Analysis & Proposal Studio — Solar Intelligence Platform',
  description: 'Personalized solar sizing, 25-year financial cashflows, and ML generation curves for Telangana.',
}

export default async function AnalysisPage() {
  const user = await getCurrentUser()
  let profile = null
  if (user) {
    profile = await getSolarProfile(user.id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solar Proposal & System Sizing Studio</h1>
        <p className="text-sm text-muted-foreground">
          Real-time simulation engine combining physics equations, Telangana electricity tariffs, and Deccan climate models.
        </p>
      </div>

      <SolarAnalysisStudio initialProfile={profile} />
    </div>
  )
}
