import { requireUser } from '@/lib/dal/users'
import AppShell from '@/components/layout/AppShell'

export const dynamic = 'force-dynamic'

// Private, per-user pages: keep them out of search results.
export const metadata = { robots: { index: false, follow: false } }

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return <AppShell email={user.email}>{children}</AppShell>
}
