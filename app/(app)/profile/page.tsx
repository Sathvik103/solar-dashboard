import { requireUser } from '@/lib/dal/users'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { listDeviceTokens } from '@/lib/dal/devices'
import { Page } from '@/components/layout/Page'
import SolarProfileForm from './_components/SolarProfileForm'
import DeviceTokensPanel from './_components/DeviceTokensPanel'

export const metadata = { title: 'Settings' }

export default async function ProfilePage() {
  const user = await requireUser()
  const [existingProfile, devices] = await Promise.all([getSolarProfile(user.id), listDeviceTokens()])

  return (
    <Page title="Settings" description={`Signed in as ${user.email}.`} className="max-w-[960px]">
      <SolarProfileForm existingProfile={existingProfile} />
      <DeviceTokensPanel devices={devices} />
    </Page>
  )
}
