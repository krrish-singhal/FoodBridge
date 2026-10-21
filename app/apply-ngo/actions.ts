'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/audit/activity.service'
import { sendNotification } from '@/lib/notifications/notification.service'

export interface ApplyNgoFormData {
  orgName: string
  registrationNumber: string
  contactPerson: string
  designation: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  postalCode: string
  operatingRadiusKm: number
  capacityMeals: number
  foodCategories: string[]
}

export async function submitNgoApplication(formData: FormData) {
  const orgName = (formData.get('orgName') as string)?.trim()
  const registrationNumber = (formData.get('registrationNumber') as string)?.trim()
  const contactPerson = (formData.get('contactPerson') as string)?.trim()
  const designation = (formData.get('designation') as string)?.trim()
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const phone = (formData.get('phone') as string)?.trim()
  const address = (formData.get('address') as string)?.trim()
  const city = (formData.get('city') as string)?.trim()
  const state = (formData.get('state') as string)?.trim()
  const postalCode = (formData.get('postalCode') as string)?.trim()
  const operatingRadiusKm = parseInt(formData.get('operatingRadiusKm') as string || '25', 10)
  const capacityMeals = parseInt(formData.get('capacityMeals') as string || '200', 10)

  if (!orgName || !contactPerson || !email || !phone || !address || !city) {
    return { error: 'Please fill in all mandatory fields.' }
  }

  const adminClient = createAdminClient()

  // 1. Check for existing organization with same email or registration
  const { data: existingOrg } = await adminClient
    .from('organizations')
    .select('id, verification_status')
    .eq('email', email)
    .maybeSingle()

  if (existingOrg) {
    return {
      error: `An organization application with this official email is already registered (Current status: ${existingOrg.verification_status}).`,
    }
  }

  // 2. Generate Reference Public ID
  const refCode = `FB-APP-${Math.floor(100000 + Math.random() * 900000)}`

  // 3. Insert Organization in PENDING state (does NOT grant portal access)
  const { data: newOrg, error: orgError } = await adminClient
    .from('organizations')
    .insert({
      name: orgName,
      type: 'NGO',
      address,
      city,
      state: state || null,
      country: 'India',
      postal_code: postalCode || null,
      contact_person: `${contactPerson} (${designation || 'Representative'})`,
      phone,
      email,
      location: 'POINT(77.2090 28.6139)', // Default Delhi coordinates until GPS geocoded
      capacity_meals: capacityMeals,
      operating_radius_km: operatingRadiusKm,
      verification_status: 'PENDING',
      public_id: refCode,
    } as any)
    .select('id')
    .single() as any

  if (orgError || !newOrg) {
    console.error('Failed to insert NGO organization application:', orgError)
    return { error: 'Failed to submit application. Please contact platform support.' }
  }

  // 4. Create Organization Verification Record
  const { error: vError } = await adminClient.from('organization_verification').insert({
    organization_id: newOrg.id,
    status: 'PENDING',
    created_at: new Date().toISOString(),
  } as any)

  if (vError) {
    console.error('Failed to create verification record:', vError)
  }

  // 5. Log audit trail
  await logActivity({
    event_type: 'VERIFICATION_SUBMITTED',
    entity_type: 'ORGANIZATION',
    entity_id: newOrg.id,
    entity_public_id: refCode,
    description: `Public NGO application submitted for "${orgName}". Ref: ${refCode}. Reg: ${registrationNumber || 'N/A'}`,
    severity: 'INFO',
  })

  // 6. Notify Admins
  const { data: adminUsers } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'ADMIN')

  if (adminUsers) {
    for (const a of adminUsers) {
      await sendNotification({
        userId: a.id,
        type: 'VERIFICATION_UPDATE',
        title: 'New NGO Application',
        message: `Organization "${orgName}" from ${city} has submitted an application for verification (Ref: ${refCode}).`,
        channels: ['in-app'],
      })
    }
  }

  return {
    success: true,
    refCode,
    orgName,
    email,
  }
}
