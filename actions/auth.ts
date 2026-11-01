'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/db/client'
import { clientIp, enforce } from '@/lib/rate-limit'

async function authThrottled(): Promise<AuthActionState | null> {
  const r = await enforce('auth', clientIp(await headers()))
  return r.allowed
    ? null
    : { errors: { general: [`Too many attempts. Try again in ${Math.ceil(r.retryAfterSeconds / 60)} minute(s).`] } }
}

export type AuthActionState = {
  errors?: {
    fullName?: string[]
    email?: string[]
    password?: string[]
    general?: string[]
  }
  success?: boolean
}

const SignUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const LogInSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function signUpAction(
  prevState: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState> {
  const throttled = await authThrottled()
  if (throttled) return throttled
  const rawData = {
    fullName: formData.get('full_name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parseResult = SignUpSchema.safeParse(rawData)
  if (!parseResult.success) {
    return {
      errors: parseResult.error.flatten().fieldErrors,
    }
  }

  const { fullName, email, password } = parseResult.data

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return {
        errors: {
          general: ['An account with this email already exists'],
        },
      }
    }
  } catch {
    return {
      errors: {
        general: ['An unexpected error occurred. Please try again.'],
      },
    }
  }

  redirect('/dashboard')
}

export async function logInAction(
  prevState: AuthActionState | undefined,
  formData: FormData
): Promise<AuthActionState> {
  const throttled = await authThrottled()
  if (throttled) return throttled
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const redirectPath = (formData.get('redirect') as string) || '/dashboard'

  const parseResult = LogInSchema.safeParse(rawData)

  if (!parseResult.success) {
    return {
      errors: parseResult.error.flatten().fieldErrors,
    }
  }

  const { email, password } = parseResult.data

  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('[LOGIN] Supabase result:', {
      userId: data.user?.id,
      hasSession: !!data.session,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorStatus: error?.status,
    })

    if (error) {
      return {
        errors: {
          general: [
            `${error.code ?? 'AUTH_ERROR'}: ${error.message}`,
          ],
        },
      }
    }

    if (!data.session || !data.user) {
      return {
        errors: {
          general: ['Login succeeded but no session was created.'],
        },
      }
    }
  } catch (error) {
    console.error('[LOGIN] Unexpected error:', error)

    return {
      errors: {
        general: [
          error instanceof Error
            ? error.message
            : 'Unexpected authentication error',
        ],
      },
    }
  }

  redirect(redirectPath)
}
export async function logOutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  } catch {
    // ignore signout errors
  }
  redirect('/')
}
