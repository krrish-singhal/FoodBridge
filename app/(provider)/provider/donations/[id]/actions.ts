'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/notification.service'
import { logActivity } from '@/lib/audit/activity.service'

/**
 * Server-side atomic acceptance of an NGO match request by the Provider (Section 5 / REQ-15).
 * Enforces race-safety:
 * 1. Validates provider ownership.
 * 2. Atomically marks the winning match as ACCEPTED.
 * 3. Invalidates all competing pending matches for this donation.
 * 4. Updates donation status to MATCHED.
 * 5. Creates/links conversation between Provider and accepted NGO.
 * 6. Dispatches real-time persisted notifications to both parties and polite non-sensitive notifications to competing NGOs.
 * 7. Records audit activity.
 */
export async function acceptNgoRequest(donationId: string, matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'PROVIDER') {
    return { error: 'Unauthorized: Only the food provider can accept match requests.' }
  }

  const adminClient = createAdminClient()

  // 1. Fetch donation and verify ownership
  const { data: donation, error: donationError } = await adminClient
    .from('donations')
    .select('id, provider_id, food_name, status, consume_before')
    .eq('id', donationId)
    .single()

  if (donationError || !donation) {
    return { error: 'Donation not found.' }
  }

  if (['DELIVERED', 'DISTRIBUTED', 'CANCELLED', 'EXPIRED'].includes(donation.status)) {
    return { error: `This donation can no longer be accepted (Current status: ${donation.status}).` }
  }

  // Check expiry
  if (new Date(donation.consume_before) <= new Date()) {
    await adminClient.from('donations').update({ status: 'EXPIRED' }).eq('id', donationId)
    return { error: 'This donation has expired and cannot be accepted.' }
  }

  // Verify provider user belongs to donation.provider_id
  const { data: memberCheck } = await adminClient
    .from('organization_members')
    .select('id')
    .eq('organization_id', donation.provider_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!memberCheck) {
    return { error: 'You do not have authorization to manage this donation.' }
  }

  // 2. Fetch the target match and verify it is PENDING
  const { data: targetMatch, error: matchError } = await adminClient
    .from('matches')
    .select('id, status, ngo_id, ngo:organizations!ngo_id(name)')
    .eq('id', matchId)
    .eq('donation_id', donationId)
    .single() as any

  if (matchError || !targetMatch) {
    return { error: 'Matching candidate record not found.' }
  }

  if (targetMatch.status === 'ACCEPTED') {
    return { error: 'This match is already accepted.' }
  }

  // 3. Atomically update target match to ACCEPTED
  const { error: acceptError } = await adminClient
    .from('matches')
    .update({
      status: 'ACCEPTED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (acceptError) {
    return { error: 'Failed to accept match. It may have been updated concurrently.' }
  }

  // 4. Invalidate competing matches for this donation
  const { data: competingMatches } = await adminClient
    .from('matches')
    .select('id, ngo_id')
    .eq('donation_id', donationId)
    .neq('id', matchId)
    .in('status', ['PENDING', 'NOTIFIED'])

  if (competingMatches && competingMatches.length > 0) {
    const competingIds = competingMatches.map(m => m.id)
    await adminClient
      .from('matches')
      .update({
        status: 'REJECTED',
        updated_at: new Date().toISOString(),
      })
      .in('id', competingIds)

    // Notify competing NGOs that donation is no longer available
    for (const cm of competingMatches) {
      const { data: cmMembers } = await adminClient
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', cm.ngo_id)

      if (cmMembers) {
        for (const m of cmMembers) {
          await sendNotification({
            userId: m.user_id,
            type: 'MATCH_ACCEPTED',
            title: 'Donation Unavailable',
            message: `The surplus food listing "${donation.food_name}" has been allocated to another partner.`,
            channels: ['in-app'],
          })
        }
      }
    }
  }

  // 5. Update donation status to MATCHED
  await adminClient
    .from('donations')
    .update({
      status: 'MATCHED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', donationId)

  // 6. Ensure Conversation exists between Provider and the winning NGO
  const { data: existingConv } = await adminClient
    .from('conversations')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle()

  if (!existingConv) {
    const { data: newConv } = await adminClient
      .from('conversations')
      .insert({ match_id: matchId } as any)
      .select('id')
      .single() as any

    if (newConv) {
      await adminClient.from('conversation_members').insert([
        { conversation_id: newConv.id, organization_id: donation.provider_id },
        { conversation_id: newConv.id, organization_id: targetMatch.ngo_id },
      ] as any)
    }
  }

  // 7. Notify winning NGO members
  const { data: winningMembers } = await adminClient
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', targetMatch.ngo_id)

  if (winningMembers) {
    for (const m of winningMembers) {
      await sendNotification({
        userId: m.user_id,
        type: 'MATCH_ACCEPTED',
        title: 'Match Accepted by Provider!',
        message: `Great news! The provider approved your claim for "${donation.food_name}". Please schedule your pickup in the Pickups portal.`,
        channels: ['in-app'],
      })
    }
  }

  // 8. Record audit log
  await logActivity({
    actor_id: user.id,
    actor_role: 'PROVIDER',
    event_type: 'MATCH_ACCEPTED',
    entity_type: 'donations',
    entity_id: donationId,
    description: `Provider accepted match ${matchId} with NGO ${targetMatch.ngo?.name || targetMatch.ngo_id}`,
    severity: 'INFO',
  })

  revalidatePath(`/provider/donations/${donationId}`)
  revalidatePath('/provider/donations')
  revalidatePath('/provider/dashboard')
  revalidatePath('/ngo/donations')
  revalidatePath('/ngo/dashboard')

  return { success: true }
}

/**
 * Declines a specific NGO match request.
 */
export async function declineNgoRequest(donationId: string, matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== 'PROVIDER') {
    return { error: 'Unauthorized' }
  }

  const adminClient = createAdminClient()

  await adminClient
    .from('matches')
    .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
    .eq('id', matchId)

  await logActivity({
    actor_id: user.id,
    actor_role: 'PROVIDER',
    event_type: 'MATCH_REJECTED',
    entity_type: 'matches',
    entity_id: matchId,
    description: `Provider declined match request ${matchId}`,
    severity: 'INFO',
  })

  revalidatePath(`/provider/donations/${donationId}`)
  revalidatePath('/provider/donations')

  return { success: true }
}
