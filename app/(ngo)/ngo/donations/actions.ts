'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/notification.service'
import { logActivity } from '@/lib/audit/activity.service'

export async function acceptMatch(matchId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'NGO') {
    return { error: 'Unauthorized' }
  }

  // Transaction-like updates
  const { data: match, error: matchError } = await adminClient
    .from('matches')
    .update({ status: 'ACCEPTED', updated_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('status', 'PENDING') // Ensure it hasn't expired or been modified
    .select('donation_id')
    .single()

  if (matchError || !match) {
    return { error: 'Failed to accept match. It may have expired.' }
  }

  // Update donation status to MATCHED (it should already be matched, but just in case) or we keep it MATCHED.
  // Actually, wait, when matched, the donation status was MATCHED. 
  // Now we need to create a PICKUP. The next step in the flow is scheduling the pickup.
  
  // We log the event
  await adminClient.from('match_events').insert({
    match_id: matchId,
    event_type: 'ACCEPTED',
    actor_id: user.id
  } as any)

  // Fetch full match data to get org IDs
  const { data: fullMatch } = await adminClient.from('matches').select('ngo_id, donation:donations(provider_id)').eq('id', matchId).single() as any
  if (fullMatch) {
    // Create Conversation
    const { data: conv } = await adminClient.from('conversations').insert({ match_id: matchId } as any).select().single() as any
    if (conv) {
      await adminClient.from('conversation_members').insert([
        { conversation_id: conv.id, organization_id: fullMatch.ngo_id },
        { conversation_id: conv.id, organization_id: fullMatch.donation.provider_id }
      ] as any)
    }

    // Notify Provider
    const { data: providerMembers } = await adminClient.from('organization_members').select('user_id').eq('organization_id', fullMatch.donation.provider_id)
    if (providerMembers) {
      for (const m of providerMembers) {
        await sendNotification({
          userId: m.user_id,
          type: 'MATCH_ACCEPTED',
          title: 'Match Accepted!',
          message: 'An NGO has accepted your food donation. They will coordinate a pickup time shortly.',
          channels: ['in-app']
        })
      }
    }
  }
  
  await logActivity({
    actor_id: user.id,
    actor_role: 'NGO',
    event_type: 'MATCH_ACCEPTED',
    entity_type: 'matches',
    entity_id: matchId,
    description: `Match accepted for donation ${match.donation_id}`,
    severity: 'INFO'
  })

  revalidatePath('/ngo/donations')
  revalidatePath('/ngo/pickups')
  revalidatePath('/ngo/dashboard')
  
  return { success: true }
}

export async function rejectMatch(matchId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: match, error: matchError } = await adminClient
    .from('matches')
    .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
    .eq('id', matchId)
    .select('donation_id')
    .single()

  if (matchError || !match) {
    return { error: 'Failed to reject match.' }
  }

  await adminClient.from('match_events').insert({
    match_id: matchId,
    event_type: 'REJECTED',
    actor_id: user.id
  } as any)
  
  await logActivity({
    actor_id: user.id,
    actor_role: 'NGO',
    event_type: 'MATCH_REJECTED',
    entity_type: 'matches',
    entity_id: matchId,
    description: `Match rejected for donation ${match.donation_id}`,
    severity: 'INFO'
  })
  
  // Rematching logic should run here
  import('@/lib/matching/matching.service').then(({ triggerMatchingEngine }) => {
     triggerMatchingEngine(match.donation_id)
  })

  revalidatePath('/ngo/donations')
  revalidatePath('/ngo/dashboard')

  return { success: true }
}
