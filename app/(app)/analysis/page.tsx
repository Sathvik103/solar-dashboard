import { requireUser } from '@/lib/dal/users'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { Page } from '@/components/layout/Page'
import SolarAnalysisStudio from './_components/SolarAnalysisStudio'

export const metadata = {
  title: 'Planner',
  description: 'Size a rooftop system and see costs, subsidy, savings and payback for your roof and climate.',
}

export default async function AnalysisPage() {
  const user = await requireUser()
  const profile = await getSolarProfile(user.id)

  return (
    <Page
      title="Planner"
      description="Size a rooftop system for your roof and consumption. Generation uses measured climate for your city; savings follow the LT-I slab ladder month by month."
    >
      <SolarAnalysisStudio initialProfile={profile} />
    </Page>
  )
}
