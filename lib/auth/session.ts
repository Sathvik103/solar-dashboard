import 'server-only'

import { createSupabaseServerClient } from '@/lib/db/client'
import type { User } from '@/lib/types/user'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at,
    }
  } catch {
    return null
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
