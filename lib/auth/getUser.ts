import { cache } from 'react'
import { getOrCreateProfile } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'

export type UserProfile = Database['public']['Tables']['profiles']['Row']
export type UserOrganization = Database['public']['Tables']['organizations']['Row'] & {
  role_in_org: string
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<{
  user: any
  profile: UserProfile
} | null> {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }

  try {
    const profile = await getOrCreateProfile(user)
    return { user, profile }
  } catch (error) {
    console.error('Profile retrieval failed:', error)
    return null
  }
})

export async function getUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      organizations (*)
    `)
    .eq('user_id', userId)

  if (error || !data) {
    return []
  }

  return data.map(item => ({
    ...item.organizations as Database['public']['Tables']['organizations']['Row'],
    role_in_org: item.role
  }))
}

export async function requireRole(allowedRoles: UserProfile['role'][]) {
  const currentUser = await getCurrentUser()
  
  if (!currentUser) {
    throw new Error('UNAUTHORIZED')
  }

  if (!allowedRoles.includes(currentUser.profile.role)) {
    throw new Error('FORBIDDEN')
  }

  return currentUser
}
