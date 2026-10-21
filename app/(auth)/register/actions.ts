'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function register(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  const role = formData.get('role') as 'PROVIDER' | 'NGO'
  const orgName = formData.get('orgName') as string
  const orgType = formData.get('orgType') as "NGO" | "RESTAURANT" | "HOTEL" | "EVENT_ORGANIZER" | "CATERER" | "SUPERMARKET" | "OTHER"
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const country = formData.get('country') as string

  if (!email || !password || !confirmPassword || !role || !orgName || !orgType || !address || !city || !country) {
    return { error: 'Please fill in all required fields' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  if (!['PROVIDER', 'NGO'].includes(role)) return { error: 'Choose a provider or NGO account.' }

  const adminClient = createAdminClient()

  // Pre-check duplicates
  const { data: existingEmail } = await adminClient.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existingEmail) {
    return { error: 'An account with this email already exists.' }
  }

  const { data: existingPhoneProf } = await adminClient.from('profiles').select('id').eq('phone', phone).maybeSingle()
  const { data: existingPhoneOrg } = await adminClient.from('organizations').select('id').eq('phone', phone).maybeSingle()
  if (existingPhoneProf || existingPhoneOrg) {
    return { error: 'An account with this phone number already exists.' }
  }

  const { data: existingOrg } = await adminClient
    .from('organizations')
    .select('id')
    .eq('name', orgName)
    .eq('type', orgType)
    .eq('address', address)
    .eq('city', city)
    .eq('country', country)
    .maybeSingle()
  
  if (existingOrg) {
    return { error: 'An organization with these exact details already exists.' }
  }

  // 1. Sign up the user via Admin API to bypass rate limits and auto-confirm
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: fullName }
  })

  if (authError || !authData?.user) {
    // If user already exists, Supabase might throw an error. We handle it here.
    return { error: authError?.message || 'Failed to sign up' }
  }

  const userId = authData.user.id

  // 2. Use Admin Client to create Profile, Org, and Membership because RLS might block normal inserts if not careful

  try {
    // Insert profile
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      email,
      full_name: fullName,
      phone,
      role,
    })

    if (profileError) throw profileError

    // Insert organization
    const { data: orgData, error: orgError } = await adminClient.from('organizations').insert({
      name: orgName,
      type: orgType,
      address,
      city,
      country,
      contact_person: fullName,
      phone,
      email,
      // Default location to 0,0 until geocoding is done
      location: 'POINT(0 0)'
    }).select().single()

    if (orgError) throw orgError

    // Insert organization member
    const { error: memberError } = await adminClient.from('organization_members').insert({
      organization_id: orgData.id,
      user_id: userId,
      role: 'ADMIN' // They are the admin of their own org
    })

    if (memberError) throw memberError

    // Insert default notification preferences
    await adminClient.from('notification_preferences').insert({
      user_id: userId
    })

    // Insert reliability score entry
    await adminClient.from('reliability_scores').insert({
      organization_id: orgData.id,
      score: 100 // Start with perfect score
    })

  } catch (error: unknown) {
    // If something fails, we should ideally rollback. For simplicity here, we return the error.
    console.error('Registration setup error:', error)
    return { error: 'Failed to complete registration setup. Please contact support.' }
  }

  // 1.5 Sign the user in to establish the session cookie
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { error: 'Account created, but failed to log in automatically.' }
  }

  revalidatePath('/', 'layout')
  
  if (role === 'PROVIDER') return { success: true, redirectTo: '/provider/dashboard' }
  if (role === 'NGO') return { success: true, redirectTo: '/ngo/dashboard' }
  
  return { success: true, redirectTo: '/' }
}
