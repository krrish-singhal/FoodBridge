'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProfile } from '@/lib/auth/profile'
import { getPortalPath } from '@/lib/auth/portals'

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Email and password are required' }

  const supabase = await createClient()
  let data
  let error
  try {
    const res = await supabase.auth.signInWithPassword({ email, password })
    data = res.data
    error = res.error
  } catch (err: any) {
    console.error('Supabase signInWithPassword threw an exception:', err)
    return { error: 'Network error connecting to the authentication server. Please try again.' }
  }

  if (error) {
    console.error('Supabase signIn Error:', error)
    const msg = error.message.toLowerCase()
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) {
      return { error: 'Network error connecting to the server. Please check your connection.' }
    }
    if (msg.includes('invalid login credentials')) {
      return { error: 'Invalid email or password.' }
    }
    return { error: 'Invalid email or password.' } // Default to safe generic message
  }

  if (!data?.user) {
    return { error: 'Authentication failed. User data is missing.' }
  }

  try {
    const profile = await getOrCreateProfile(data.user)
    revalidatePath('/', 'layout')
    return { success: true, redirectTo: getPortalPath(profile.role) }
  } catch (error) {
    console.error('Profile retrieval failed:', error)
    await supabase.auth.signOut()
    return { error: 'Your credentials were accepted, but your profile could not be loaded. Please try again.' }
  }
}
