'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/audit/activity.service'
import { getOrganizationReliability } from '@/lib/analytics/reliability'

export interface SubmitRatingParams {
  matchId: string
  targetOrgId: string
  score: number // 1 to 5
  review?: string
}

export async function submitRating(params: SubmitRatingParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!params.matchId || !params.targetOrgId || params.score < 1 || params.score > 5) {
    return { error: 'Invalid rating parameters.' }
  }

  const adminClient = createAdminClient()

  // 1. Get reviewer's organization
  const { data: member } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return { error: 'No associated organization found.' }
  }

  const reviewerOrgId = member.organization_id

  // 2. Verify reviewer is not rating themselves
  if (reviewerOrgId === params.targetOrgId) {
    return { error: 'You cannot rate your own organization.' }
  }

  // 3. Upsert rating record
  const { error: ratingError } = await adminClient
    .from('ratings')
    .upsert({
      match_id: params.matchId,
      reviewer_org_id: reviewerOrgId,
      target_org_id: params.targetOrgId,
      score: params.score,
      review: params.review || null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'match_id,reviewer_org_id' })

  if (ratingError) {
    console.error('Error submitting rating:', ratingError)
    return { error: 'Failed to record rating.' }
  }

  // 4. Update target organization's reliability score
  const { data: targetOrg } = await adminClient
    .from('organizations')
    .select('id, type')
    .eq('id', params.targetOrgId)
    .single()

  if (targetOrg) {
    const updatedScore = await getOrganizationReliability(
      targetOrg.id,
      targetOrg.type === 'NGO' ? 'NGO' : 'PROVIDER'
    )
    await adminClient
      .from('reliability_scores')
      .upsert({
        organization_id: targetOrg.id,
        score: updatedScore,
        last_calculated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' })
  }

  // 5. Log audit event
  await logActivity({
    actor_id: user.id,
    actor_role: user.user_metadata?.role,
    event_type: 'RATING_SUBMITTED',
    entity_type: 'ratings',
    entity_id: params.matchId,
    description: `Submitted ${params.score}-star rating for match ${params.matchId}`,
    severity: 'INFO',
  })

  revalidatePath('/provider/pickups')
  revalidatePath('/ngo/pickups')
  revalidatePath('/provider/dashboard')
  revalidatePath('/ngo/dashboard')

  return { success: true }
}
