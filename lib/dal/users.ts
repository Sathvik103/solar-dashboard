import 'server-only'

import { getCurrentUser as fetchCurrentUser, requireUser as fetchRequireUser } from '@/lib/auth/session'
import type { User } from '@/lib/types/user'

export async function getCurrentUser(): Promise<User | null> {
  return fetchCurrentUser()
}

export async function requireUser(): Promise<User> {
  return fetchRequireUser()
}
