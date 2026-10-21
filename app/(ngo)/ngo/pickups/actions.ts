'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/notification.service'
import { logActivity } from '@/lib/audit/activity.service'

/**
 * Schedules a pickup with coordinator details and generates a secure 6-digit OTP (REQ-16 & REQ-18).
 */
export async function schedulePickup(formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'NGO') {
    return { error: 'Unauthorized: Only NGOs can schedule pickups.' }
  }

  const matchId = formData.get('matchId') as string
  const scheduledTimeStr = formData.get('scheduledTime') as string
  const coordinatorName = formData.get('coordinatorName') as string
  const coordinatorPhone = formData.get('coordinatorPhone') as string
  const vehicleDetails = formData.get('vehicleDetails') as string

  if (!matchId || !scheduledTimeStr || !coordinatorName || !coordinatorPhone) {
    return { error: 'Please provide scheduled time, coordinator name, and phone number.' }
  }

  const scheduledTime = new Date(scheduledTimeStr).toISOString()

  // 1. Create Pickup Record
  const { data: pickup, error: pickupError } = await adminClient
    .from('pickups')
    .insert({
      match_id: matchId,
      scheduled_time: scheduledTime,
      coordinator_name: coordinatorName,
      coordinator_phone: coordinatorPhone,
      vehicle_details: vehicleDetails || 'Standard Vehicle',
      status: 'SCHEDULED',
    } as any)
    .select()
    .single() as any

  if (pickupError || !pickup) {
    console.error('Pickup insert error:', pickupError)
    return { error: 'Failed to schedule pickup. Please check parameters and try again.' }
  }

  // 2. Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(new Date(scheduledTime).getTime() + 6 * 60 * 60 * 1000).toISOString() // 6 hrs validity

  await adminClient.from('pickup_otp').insert({
    pickup_id: pickup.id,
    otp_hash: otp,
    expires_at: expiresAt,
    is_used: false,
    attempts: 0,
  } as any)

  // 3. Update Donation Status to PICKUP_SCHEDULED
  const { data: matchData } = await adminClient
    .from('matches')
    .select('donation_id, donation:donations(provider_id, food_name)')
    .eq('id', matchId)
    .single() as any

  if (matchData) {
    await adminClient
      .from('donations')
      .update({ status: 'PICKUP_SCHEDULED', updated_at: new Date().toISOString() } as any)
      .eq('id', matchData.donation_id)

    // Notify Provider members
    const { data: providerMembers } = await adminClient
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', matchData.donation.provider_id)

    if (providerMembers) {
      for (const member of providerMembers) {
        await sendNotification({
          userId: member.user_id,
          type: 'PICKUP_SCHEDULED',
          title: 'Pickup Scheduled!',
          message: `The NGO has scheduled food pickup for ${new Date(scheduledTimeStr).toLocaleString()}. Coordinator: ${coordinatorName} (${coordinatorPhone}).`,
          channels: ['in-app'],
        })
      }
    }

    // Log audit activity
    await logActivity({
      actor_id: user.id,
      actor_role: 'NGO',
      event_type: 'PICKUP_SCHEDULED',
      entity_type: 'pickups',
      entity_id: pickup.id,
      description: `Scheduled pickup for "${matchData.donation.food_name}" with coordinator ${coordinatorName}`,
      severity: 'INFO',
    })
  }

  revalidatePath('/ngo/pickups')
  revalidatePath('/ngo/donations')
  revalidatePath('/ngo/dashboard')
  revalidatePath('/provider/pickups')
  revalidatePath('/provider/dashboard')

  return { success: true, otp }
}

/**
 * Updates pickup and distribution milestones: PICKED_UP -> DELIVERED -> DISTRIBUTED (REQ-20).
 */
export async function updatePickupMilestone(pickupId: string, milestone: 'DELIVERED' | 'DISTRIBUTED') {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'NGO') {
    return { error: 'Unauthorized' }
  }

  const nowIso = new Date().toISOString()

  // 1. Update pickup status
  const { data: pickup, error: pError } = await adminClient
    .from('pickups')
    .update({
      status: milestone === 'DISTRIBUTED' ? 'DELIVERED' : milestone, // pickups table supports 'DELIVERED'
      updated_at: nowIso,
    } as any)
    .eq('id', pickupId)
    .select(`
      id,
      match:matches (
        id,
        donation_id,
        donations (id, food_name, provider_id)
      )
    `)
    .single() as any

  if (pError || !pickup) {
    return { error: 'Failed to update milestone.' }
  }

  // 2. Update donation status to DELIVERED or DISTRIBUTED
  const donationId = pickup.match?.donation_id
  if (donationId) {
    await adminClient
      .from('donations')
      .update({
        status: milestone,
        updated_at: nowIso,
      } as any)
      .eq('id', donationId)

    // Notify Provider of final milestone
    const providerId = pickup.match?.donations?.provider_id
    if (providerId) {
      const { data: providerMembers } = await adminClient
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', providerId)

      if (providerMembers) {
        for (const m of providerMembers) {
          await sendNotification({
            userId: m.user_id,
            type: 'DELIVERY_COMPLETED',
            title: milestone === 'DISTRIBUTED' ? 'Meals Distributed to Beneficiaries!' : 'Surplus Food Delivered!',
            message: `Your donation "${pickup.match?.donations?.food_name}" has reached milestone: ${milestone}. Thank you for making an impact!`,
            channels: ['in-app'],
          })
        }
      }
    }

    // Log audit activity
    await logActivity({
      actor_id: user.id,
      actor_role: 'NGO',
      event_type: milestone === 'DISTRIBUTED' ? 'PICKUP_COMPLETED' : 'PICKUP_CONFIRMED',
      entity_type: 'donations',
      entity_id: donationId,
      description: `Donation milestone reached: ${milestone}`,
      severity: 'INFO',
    })
  }

  revalidatePath('/ngo/pickups')
  revalidatePath('/ngo/dashboard')
  revalidatePath('/provider/pickups')
  revalidatePath('/provider/dashboard')

  return { success: true }
}
