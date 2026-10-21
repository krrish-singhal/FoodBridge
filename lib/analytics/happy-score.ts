import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganizationReliability } from './reliability'

export interface HappyScoreBreakdown {
  score: number
  previousScore: number
  change: number
  tier: 'Champion' | 'Leader' | 'Active Contributor' | 'Getting Started'
  factors: {
    category: string
    points: number
    maxPoints: number
    explanation: string
  }[]
  penalties: {
    reason: string
    deduction: number
  }[]
  summary: string
}

/**
 * Deterministic, server-calculated Happy Score formula (REQ-36 / Section 3.3).
 * Rewards verified donation impact, reliability, food safety, and consistency.
 * Scale: 0 to 100.
 */
export async function calculateHappyScore(organizationId: string): Promise<HappyScoreBreakdown> {
  const supabase = createAdminClient()

  // 1. Fetch organization and donations
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, type, verification_status, created_at')
    .eq('id', organizationId)
    .single()

  const { data: donations } = await supabase
    .from('donations')
    .select('id, status, meals_estimate, quantity, quantity_unit, created_at')
    .eq('provider_id', organizationId)

  const safeDonations = donations || []
  const totalCreated = safeDonations.length

  const completedDonations = safeDonations.filter(d =>
    ['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(d.status)
  )
  const cancelledDonations = safeDonations.filter(d => d.status === 'CANCELLED')
  const failedDonations = safeDonations.filter(d => d.status === 'FAILED')

  const totalMealsSaved = completedDonations.reduce((sum, d) => sum + (d.meals_estimate || 0), 0)

  // 2. Fetch safety checklists for these donations
  let compliantCount = 0
  if (safeDonations.length > 0) {
    const donationIds = safeDonations.map(d => d.id)
    const { data: checklists } = await supabase
      .from('donation_safety_checklists')
      .select('donation_id, proper_storage, safe_packaging, temp_controlled')
      .in('donation_id', donationIds)

    if (checklists && checklists.length > 0) {
      compliantCount = checklists.filter(
        c => c.proper_storage && c.safe_packaging && c.temp_controlled
      ).length
    }
  }

  // 3. Fetch reliability score
  const reliability = await getOrganizationReliability(organizationId, 'PROVIDER')

  // --- CALCULATION FORMULA ---
  // Base Score: 50 points
  const basePoints = 50

  // Impact: Meals Rescued (Max 15 pts) -> 1 pt per 25 meals
  const mealsBonus = Math.min(15, Math.floor(totalMealsSaved / 25))

  // Completion Rate (Max 20 pts)
  let completionBonus = 0
  if (totalCreated > 0) {
    const rate = completedDonations.length / totalCreated
    completionBonus = Math.round(rate * 20)
  }

  // Food Safety Compliance (Max 5 pts)
  let safetyBonus = 0
  if (totalCreated > 0) {
    const safetyRate = compliantCount / totalCreated
    safetyBonus = Math.round(safetyRate * 5)
  }

  // Reliability & Verification (Max 10 pts)
  const reliabilityBonus = Math.round((reliability / 100) * 10)

  // Penalties
  const penaltiesList: { reason: string; deduction: number }[] = []
  if (cancelledDonations.length > 0) {
    const deduction = Math.min(15, cancelledDonations.length * 3)
    penaltiesList.push({
      reason: `${cancelledDonations.length} cancelled donation${cancelledDonations.length > 1 ? 's' : ''}`,
      deduction,
    })
  }
  if (failedDonations.length > 0) {
    const deduction = Math.min(20, failedDonations.length * 5)
    penaltiesList.push({
      reason: `${failedDonations.length} failed delivery/pickup${failedDonations.length > 1 ? 's' : ''}`,
      deduction,
    })
  }

  const totalDeductions = penaltiesList.reduce((sum, p) => sum + p.deduction, 0)

  // Raw score
  const rawScore = basePoints + mealsBonus + completionBonus + safetyBonus + reliabilityBonus - totalDeductions
  const finalScore = Math.max(10, Math.min(100, Math.round(rawScore)))

  // Determine Tier
  let tier: HappyScoreBreakdown['tier'] = 'Getting Started'
  if (finalScore >= 90) tier = 'Champion'
  else if (finalScore >= 75) tier = 'Leader'
  else if (finalScore >= 60) tier = 'Active Contributor'

  // Estimate previous score (e.g. from 30 days ago)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentDonations = safeDonations.filter(d => new Date(d.created_at) > thirtyDaysAgo)
  const previousScore = Math.max(10, Math.min(100, finalScore - Math.min(8, recentDonations.length * 2)))
  const change = finalScore - previousScore

  return {
    score: finalScore,
    previousScore,
    change,
    tier,
    factors: [
      {
        category: 'Base Standing',
        points: basePoints,
        maxPoints: 50,
        explanation: 'Initial trust baseline for verified food donors.',
      },
      {
        category: 'Meals Rescued',
        points: mealsBonus,
        maxPoints: 15,
        explanation: `${totalMealsSaved} meals diverted from waste to hunger relief.`,
      },
      {
        category: 'Completed Handover Rate',
        points: completionBonus,
        maxPoints: 20,
        explanation: `${completedDonations.length} of ${totalCreated} listings successfully delivered to verified NGOs.`,
      },
      {
        category: 'Food Safety Compliance',
        points: safetyBonus,
        maxPoints: 5,
        explanation: `${compliantCount} batches passed temperature & packaging checklists.`,
      },
      {
        category: 'Partner Reliability',
        points: reliabilityBonus,
        maxPoints: 10,
        explanation: `Historical fulfillment index at ${reliability}%.`,
      },
    ],
    penalties: penaltiesList,
    summary: `${org?.name || 'Provider'} has earned a ${tier} score of ${finalScore}/100 with ${totalMealsSaved} meals delivered and ${reliability}% partner reliability.`,
  }
}
