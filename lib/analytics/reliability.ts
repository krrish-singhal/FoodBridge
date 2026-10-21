import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Calculates the reliability score of an organization based on their historical performance.
 * Score is between 0 and 100.
 * Default score for new organizations is 100.
 */
export async function getOrganizationReliability(organizationId: string, orgType: 'PROVIDER' | 'NGO'): Promise<number> {
  const supabase = createAdminClient()
  let score = 100

  if (orgType === 'PROVIDER') {
    // Provider Reliability: How many of their donations successfully resulted in a pickup vs were cancelled/failed.
    const { data: donations } = await supabase
      .from('donations')
      .select('status')
      .eq('provider_id', organizationId) as any

    if (!donations || donations.length === 0) return score

    let completed = 0
    let failed = 0
    
    donations.forEach((d: any) => {
      if (['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(d.status)) completed++
      else if (['CANCELLED', 'FAILED'].includes(d.status)) failed++
    })
    
    const total = completed + failed
    if (total === 0) return score
    
    score = Math.round((completed / total) * 100)
    
  } else {
    // NGO Reliability: How many accepted matches resulted in a successful pickup.
    const { data: matches } = await supabase
      .from('matches')
      .select('id, status, pickups(status)')
      .eq('ngo_id', organizationId) as any
      
    if (!matches || matches.length === 0) return score

    let completed = 0
    let failed = 0
    
    matches.forEach((m: any) => {
      // If a match was rejected by the NGO, it slightly hurts reliability but mostly we care about failed pickups
      if (m.status === 'REJECTED') {
        failed += 0.5 // minor penalty for rejecting
      } else if (m.pickups && m.pickups.length > 0) {
        const pStatus = m.pickups[0].status
        if (['PICKED_UP', 'DELIVERED'].includes(pStatus)) completed++
        else if (['FAILED'].includes(pStatus)) failed++
      } else if (m.status === 'FAILED' || m.status === 'EXPIRED') {
         failed++
      }
    })
    
    const total = completed + failed
    if (total === 0) return score
    
    score = Math.round((completed / total) * 100)
  }

  return Math.max(0, Math.min(100, score))
}
