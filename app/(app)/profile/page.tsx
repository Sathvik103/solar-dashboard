import Link from 'next/link'
import { requireUser } from '@/lib/dal/users'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import { Page } from '@/components/layout/Page'
import SolarProfileForm from './_components/SolarProfileForm'

export const metadata = { title: 'Settings' }

export default async function ProfilePage() {
  const user = await requireUser()
  const existingProfile = await getSolarProfile(user.id)

  return (
    <Page
      title="Settings"
      description={
        <>
          Signed in as {user.email}. Device tokens live under{' '}
          <Link href="/devices" className="text-primary underline underline-offset-2">
            Devices
          </Link>
          .
        </>
      }
      className="max-w-[960px]"
    >
      <SolarProfileForm existingProfile={existingProfile} />
    </Page>
  )
}
