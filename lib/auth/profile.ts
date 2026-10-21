import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'

export type UserProfile = Database['public']['Tables']['profiles']['Row']

// Call only with a user verified by Supabase Auth, never a caller-supplied ID.
export async function getOrCreateProfile(user: User): Promise<UserProfile> {
  const admin = createAdminClient()

  // 1. Check if profile already exists by user ID
  const { data: byId, error: errById } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (errById) throw errById
  if (byId) return byId

  if (!user.email) throw new Error('The account has no email address.')

  // 2. Check if profile already exists by email (e.g. re-created auth account)
  const { data: byEmail, error: errByEmail } = await admin.from('profiles').select('*').eq('email', user.email).maybeSingle()
  if (errByEmail) throw errByEmail
  if (byEmail) {
    if (byEmail.id !== user.id) {
      // Re-link to active auth user ID if different
      const { data: updated, error: updateErr } = await admin
        .from('profiles')
        .update({ id: user.id })
        .eq('email', user.email)
        .select('*')
        .single()
      if (!updateErr && updated) return updated
    }
    return byEmail
  }

  // 3. app_metadata is server-managed. Never grant roles from editable user_metadata.
  const trustedRole = user.app_metadata?.role
  const role = ['PROVIDER', 'NGO', 'ADMIN', 'CSR'].includes(trustedRole) ? trustedRole : 'PROVIDER'
  const { error: insertError } = await admin.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
    role,
  }, { onConflict: 'id', ignoreDuplicates: true })

  if (insertError) {
    // If a concurrent request inserted this profile simultaneously (code 23505), re-fetch and return
    if ((insertError as any).code === '23505') {
      const { data: existing } = await admin
        .from('profiles')
        .select('*')
        .or(`id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle()
      if (existing) return existing
    }
    throw insertError
  }

  // 4. Re-read to guarantee consistent persisted state
  const { data: profile, error: readError } = await admin
    .from('profiles')
    .select('*')
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  if (profile) return profile
  if (readError) throw readError
  throw new Error('Profile could not be loaded or created.')
}
