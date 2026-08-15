import Navbar from '@/components/layout/Navbar'
import { getCurrentUser } from '@/lib/dal/users'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar user={user} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
