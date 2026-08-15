import { requireUser } from '@/lib/dal/users'
import { getSolarProfile } from '@/lib/dal/solar-profiles'
import SolarProfileForm from './_components/SolarProfileForm'

export default async function ProfilePage() {
  const user = await requireUser()
  const existingProfile = await getSolarProfile(user.id)

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Solar Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Logged in as <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </div>

      <SolarProfileForm existingProfile={existingProfile} />
    </div>
  )
}
