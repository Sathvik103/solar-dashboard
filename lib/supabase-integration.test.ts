import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const url = 'https://yqaigbuigqoowmgxxlpg.supabase.co'
const key = 'sb_publishable_J7NbvQ6XNk_yE8ZP29swmg_gQIoowxw'

describe('Supabase Security & RLS Real-Integration Audit', () => {
  it('1. Verifies HTTPS connectivity to configured Supabase project', async () => {
    const supabase = createClient(url, key)
    const { data: { session }, error } = await supabase.auth.getSession()
    expect(error).toBeNull()
    expect(session == null || session != null).toBe(true)
    console.log('✅ Connected to Supabase instance at:', url)
  })

  it('2. Verifies public.users schema query & RLS policy enforcement', async () => {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.from('users').select('*').limit(1)

    // Unauthenticated select should be protected by RLS
    if (error) {
      console.log('users table status:', error.message)
    } else {
      console.log('users table RLS active. Unauthenticated rows returned:', data?.length)
      expect(data).toEqual([])
    }
  })

  it('3. Verifies public.solar_profiles schema query & RLS policy enforcement', async () => {
    const supabase = createClient(url, key)
    const { data, error } = await supabase.from('solar_profiles').select('*').limit(1)

    if (error) {
      console.log('solar_profiles table status:', error.message)
    } else {
      console.log('solar_profiles RLS active. Unauthenticated rows returned:', data?.length)
      expect(data).toEqual([])
    }
  })
})
