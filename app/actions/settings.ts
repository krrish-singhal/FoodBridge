'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/getUser'

export async function getSettings() {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error("Unauthorized")

  const adminClient = createAdminClient()
  const { data: member } = await adminClient
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', currentUser.user.id)
        .single()
        
  if (!member) return null

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name, email, phone, address, city, country, capacity_meals, operating_radius_km, type')
    .eq('id', member.organization_id)
    .single()

  const { data: prefData } = await adminClient
    .from('notification_preferences')
    .select('push_notifications, email_notifications')
    .eq('user_id', currentUser.user.id)
    .single()

  if (!prefData) {
    await adminClient.from('notification_preferences').insert({
      user_id: currentUser.user.id,
      push_notifications: true,
      email_notifications: true
    })
  }

  return { 
    org, 
    prefs: prefData || { push_notifications: true, email_notifications: true } 
  }
}

export async function updateSettings(orgId: string, formData: any, notifPrefs: any) {
  const currentUser = await getCurrentUser()
  if (!currentUser) throw new Error("Unauthorized")

  const adminClient = createAdminClient()

  // Verify the user is actually a member of this org
  const { data: member } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', currentUser.user.id)
    .eq('organization_id', orgId)
    .single()

  if (!member) throw new Error("Unauthorized")

  const updatePayload = {
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    address: formData.address,
    city: formData.city,
    country: formData.country,
    capacity_meals: formData.capacity_meals,
    operating_radius_km: formData.operating_radius_km,
    updated_at: new Date().toISOString()
  } as any

  await adminClient.from('organizations').update(updatePayload).eq('id', orgId)
  
  await adminClient.from('notification_preferences').update(notifPrefs).eq('user_id', currentUser.user.id)
}
