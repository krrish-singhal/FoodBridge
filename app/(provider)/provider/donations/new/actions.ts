'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, getUserOrganizations } from '@/lib/auth/getUser'
import { triggerMatchingEngine } from '@/lib/matching/matching.service'
import { logActivity } from '@/lib/audit/activity.service'

export async function createDonation(formData: FormData) {
  const auth = await getCurrentUser()
  if (!auth) throw new Error('UNAUTHORIZED')

  // Get user's organization
  const orgs = await getUserOrganizations(auth.user.id)
  if (orgs.length === 0) throw new Error('No organization found')
  const providerOrg = orgs[0]
  const providerId = providerOrg.id

  // Extract form data
  const foodName = (formData.get('foodName') as string)?.trim()
  const categoryId = formData.get('categoryId') as string
  const quantity = parseFloat(formData.get('quantity') as string)
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive number.')
  }
  const quantityUnit = (formData.get('quantityUnit') as string)?.trim() || 'kg'
  const mealsEstimate = parseInt(formData.get('mealsEstimate') as string, 10)
  if (isNaN(mealsEstimate) || mealsEstimate <= 0) {
    throw new Error('Meals estimate must be greater than zero.')
  }
  const foodType = formData.get('foodType') as string

  const preparedAtStr = formData.get('preparedAt') as string
  const consumeBeforeStr = formData.get('consumeBefore') as string
  const address = (formData.get('address') as string)?.trim()
  const coordinates = (formData.get('coordinates') as string)?.trim() || providerOrg.location || 'POINT(77.2090 28.6139)'
  const description = (formData.get('description') as string)?.trim()

  // Safety checklist validation
  const properStorage = formData.get('properStorage') === 'on'
  const safePackaging = formData.get('safePackaging') === 'on'
  const tempControlled = formData.get('tempControlled') === 'on'

  if (!properStorage || !safePackaging || !tempControlled) {
    throw new Error('You must confirm all safety checklist items before publishing.')
  }

  // Parse & validate dates
  const preparedAt = new Date(preparedAtStr)
  const consumeBefore = new Date(consumeBeforeStr)
  const now = new Date()

  if (consumeBefore <= now) {
    throw new Error('Consume-before time must be in the future.')
  }
  if (consumeBefore <= preparedAt) {
    throw new Error('Consume-before time must be later than preparation time.')
  }

  // Calculate Urgency Level
  const hoursRemaining = (consumeBefore.getTime() - now.getTime()) / (1000 * 60 * 60)
  let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  if (hoursRemaining < 2) urgency = 'CRITICAL'
  else if (hoursRemaining <= 5) urgency = 'HIGH'
  else if (hoursRemaining <= 12) urgency = 'MEDIUM'

  const adminClient = createAdminClient()

  // Insert Donation
  const { data: donation, error: donationError } = await adminClient
    .from('donations')
    .insert({
      provider_id: providerId,
      category_id: categoryId,
      food_name: foodName,
      quantity,
      quantity_unit: quantityUnit,
      meals_estimate: mealsEstimate,
      food_type: foodType,
      prepared_at: preparedAt.toISOString(),
      consume_before: consumeBefore.toISOString(),
      pickup_address: address,
      pickup_location: coordinates,
      description: description || null,
      urgency,
      status: 'AVAILABLE',
    })
    .select()
    .single()

  if (donationError || !donation) {
    console.error('Error creating donation:', donationError)
    throw new Error('Failed to create donation in database.')
  }

  // Insert Safety Checklist
  await adminClient.from('donation_safety_checklists').insert({
    donation_id: donation.id,
    proper_storage: properStorage,
    safe_packaging: safePackaging,
    temp_controlled: tempControlled,
    completed_at: new Date().toISOString(),
  })

  // Insert Allergens
  const allergens = formData.getAll('allergens') as string[]
  if (allergens.length > 0) {
    const allergenInserts = allergens.map(a => ({
      donation_id: donation.id,
      allergen: a,
    }))
    await adminClient.from('donation_allergens').insert(allergenInserts)
  }

  // Handle Recurring Donations if checked
  const isRecurring = formData.get('isRecurring') === 'on'
  const recurringSchedule = formData.get('recurringSchedule') as string
  if (isRecurring && recurringSchedule) {
    await adminClient.from('recurring_donations' as any).insert({
      provider_id: providerId,
      category_id: categoryId,
      schedule_cron: recurringSchedule,
      food_name: foodName,
      approx_quantity: quantity,
      quantity_unit: quantityUnit,
      approx_meals: mealsEstimate,
      pickup_address: address,
      pickup_location: coordinates,
      is_active: true,
    })
  }

  // Trigger Intelligent Matching Engine
  const matchResult = await triggerMatchingEngine(donation.id)

  // Log activity
  await logActivity({
    actor_id: auth.user.id,
    actor_role: 'PROVIDER',
    event_type: 'DONATION_CREATED',
    entity_type: 'donations',
    entity_id: donation.id,
    description: `Published surplus food listing: "${foodName}" (${quantity} ${quantityUnit}, ${mealsEstimate} meals). Matched with ${matchResult.matchedCount} NGOs.`,
    severity: 'INFO',
  })

  revalidatePath('/provider/donations')
  revalidatePath('/provider/dashboard')
  revalidatePath('/ngo/donations')
  revalidatePath('/ngo/dashboard')

  redirect(`/provider/donations/${donation.id}`)
}
