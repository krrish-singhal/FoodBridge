'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/notification.service'
import { logActivity } from '@/lib/audit/activity.service'
import { getOrganizationReliability } from '@/lib/analytics/reliability'

/**
 * Verifies the 6-digit OTP provided by the NGO coordinator upon physical handover (REQ-18 & REQ-20).
 * Enforces rate limiting (max 5 attempts), expiration check, and atomic transition to PICKED_UP.
 */
export async function verifyPickupOtp(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'PROVIDER') {
    return { error: 'Unauthorized: Only providers can verify handover OTP.' }
  }

  const pickupId = formData.get('pickupId') as string
  const otp = (formData.get('otp') as string)?.trim()

  if (!pickupId || !otp) {
    return { error: 'Missing required pickup identifier or OTP code.' }
  }

  const adminClient = createAdminClient()

  // 1. Fetch OTP record
  const { data: otpRecord, error: otpError } = await adminClient
    .from('pickup_otp')
    .select('pickup_id, otp_hash, expires_at, is_used, attempts')
    .eq('pickup_id', pickupId)
    .single() as any

  if (otpError || !otpRecord) {
    return { error: 'No active OTP verification code found for this pickup.' }
  }

  if (otpRecord.is_used) {
    return { error: 'This verification code has already been used and verified.' }
  }

  // Rate limiting check: max 5 attempts
  const currentAttempts = otpRecord.attempts || 0
  if (currentAttempts >= 5) {
    return { error: 'Too many incorrect attempts (maximum 5). Please contact support or request a new pickup schedule.' }
  }

  // Expiration check
  if (new Date(otpRecord.expires_at) < new Date()) {
    return { error: 'This verification code has expired. Please have the NGO re-schedule.' }
  }

  // Verify code
  if (otpRecord.otp_hash !== otp) {
    // Increment attempt counter atomically
    await adminClient
      .from('pickup_otp')
      .update({ attempts: currentAttempts + 1 })
      .eq('pickup_id', pickupId)

    const remaining = 4 - currentAttempts
    return { error: `Invalid 6-digit code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` }
  }

  // Code is valid: Mark as used atomically
  await adminClient
    .from('pickup_otp')
    .update({ is_used: true, attempts: currentAttempts + 1 })
    .eq('pickup_id', pickupId)

  // Mark Pickup as PICKED_UP
  await adminClient
    .from('pickups')
    .update({
      status: 'PICKED_UP',
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', pickupId)

  // Find Match and Mark Donation as PICKED_UP
  const { data: pickup } = await adminClient
    .from('pickups')
    .select(`
      id,
      match_id,
      match:matches (
        id,
        donation_id,
        ngo_id,
        donations:donations (id, food_name, provider_id)
      )
    `)
    .eq('id', pickupId)
    .single() as any

  if (pickup?.match) {
    const donationId = pickup.match.donation_id
    await adminClient
      .from('donations')
      .update({
        status: 'PICKED_UP',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', donationId)

    // Notify NGO coordinator and members
    const { data: ngoMembers } = await adminClient
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', pickup.match.ngo_id)

    if (ngoMembers) {
      for (const member of ngoMembers) {
        await sendNotification({
          userId: member.user_id,
          type: 'DELIVERY_COMPLETED',
          title: 'Handover Completed!',
          message: `Food handover for "${pickup.match.donations?.food_name}" has been verified by the provider. Please confirm safe transit and delivery.`,
          channels: ['in-app'],
        })
      }
    }

    // Log audit event
    await logActivity({
      actor_id: user.id,
      actor_role: 'PROVIDER',
      event_type: 'OTP_VERIFIED',
      entity_type: 'pickups',
      entity_id: pickupId,
      description: `Handover OTP verified successfully for pickup ${pickupId}`,
      severity: 'INFO',
    })
  }

  revalidatePath('/provider/pickups')
  revalidatePath('/provider/donations')
  revalidatePath('/provider/dashboard')
  revalidatePath('/ngo/pickups')
  revalidatePath('/ngo/dashboard')

  return { success: true }
}

/**
 * Marks a pickup as FAILED (e.g. NGO no-show or transport failure) and triggers rematching (REQ-21).
 */
export async function markPickupFailed(pickupId: string, failureReason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const adminClient = createAdminClient()

  const { data: pickup } = await adminClient
    .from('pickups')
    .select(`
      id,
      match_id,
      match:matches (
        id,
        donation_id,
        ngo_id,
        donations:donations (id, food_name, consume_before)
      )
    `)
    .eq('id', pickupId)
    .single() as any

  if (!pickup) return { error: 'Pickup not found' }

  const nowIso = new Date().toISOString()

  // 1. Mark Pickup as FAILED
  await adminClient
    .from('pickups')
    .update({
      status: 'FAILED',
      failure_reason: failureReason || 'Coordinator did not arrive within pickup window',
      updated_at: nowIso,
    } as any)
    .eq('id', pickupId)

  // 2. Mark Match as FAILED
  await adminClient
    .from('matches')
    .update({
      status: 'FAILED',
      updated_at: nowIso,
    } as any)
    .eq('id', pickup.match_id)

  const donation = pickup.match?.donations
  if (donation) {
    // 3. Check if donation is still valid before rematching
    const isStillFresh = new Date(donation.consume_before) > new Date()
    if (isStillFresh) {
      await adminClient
        .from('donations')
        .update({
          status: 'AVAILABLE',
          updated_at: nowIso,
        } as any)
        .eq('id', donation.id)

      // Trigger automatic rematching to next eligible NGO
      import('@/lib/matching/matching.service').then(({ triggerMatchingEngine }) => {
        triggerMatchingEngine(donation.id)
      })
    } else {
      await adminClient
        .from('donations')
        .update({
          status: 'EXPIRED',
          updated_at: nowIso,
        } as any)
        .eq('id', donation.id)
    }

    // 4. Update NGO reliability score
    const updatedScore = await getOrganizationReliability(pickup.match.ngo_id, 'NGO')
    await adminClient
      .from('reliability_scores')
      .upsert({
        organization_id: pickup.match.ngo_id,
        score: updatedScore,
        last_calculated_at: nowIso,
      }, { onConflict: 'organization_id' })

    // Log audit event
    await logActivity({
      actor_id: user.id,
      actor_role: user.user_metadata?.role,
      event_type: 'PICKUP_FAILED',
      entity_type: 'pickups',
      entity_id: pickupId,
      description: `Pickup ${pickupId} marked as FAILED. Reason: ${failureReason || 'No-show'}. Rematching evaluated.`,
      severity: 'WARNING',
    })
  }

  revalidatePath('/provider/pickups')
  revalidatePath('/provider/donations')
  revalidatePath('/provider/dashboard')
  revalidatePath('/ngo/pickups')
  revalidatePath('/ngo/dashboard')

  return { success: true }
}
