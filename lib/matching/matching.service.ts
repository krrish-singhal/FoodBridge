import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/database'
import { sendNotification } from '@/lib/notifications/notification.service'
import { getOrganizationReliability } from '@/lib/analytics/reliability'

type DonationRow = Database['public']['Tables']['donations']['Row']
type OrganizationRow = Database['public']['Tables']['organizations']['Row']

/**
 * Parses WKT geography POINT(longitude latitude) or string coordinates.
 */
export function parsePoint(pointStr: string | null): { lat: number; lng: number } | null {
  if (!pointStr) return null
  const match = pointStr.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
  if (match) {
    const lng = parseFloat(match[1])
    const lat = parseFloat(match[2])
    return { lat, lng }
  }
  return null
}

/**
 * Calculates geographic distance in kilometers between two lat/lon pairs using Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export interface MatchEvaluation {
  eligible: boolean
  distanceKm: number
  travelTimeMinutes: number
  score: number
  scoreBreakdown: {
    proximityScore: number
    capacityScore: number
    reliabilityScore: number
    urgencyScore: number
  }
  reason?: string
}

/**
 * Evaluates whether an NGO is eligible and computes an explainable matching score (0-100).
 * Checks: Verification, radius, capacity, travel time vs consume_before expiry window.
 */
export async function evaluateNgoEligibility(
  ngo: OrganizationRow,
  donation: DonationRow
): Promise<MatchEvaluation> {
  // 1. Verification check
  if (ngo.verification_status !== 'VERIFIED') {
    return {
      eligible: false,
      distanceKm: 0,
      travelTimeMinutes: 0,
      score: 0,
      scoreBreakdown: { proximityScore: 0, capacityScore: 0, reliabilityScore: 0, urgencyScore: 0 },
      reason: 'NGO is not verified',
    }
  }

  // 2. Geospatial distance calculation
  const donationCoords = parsePoint(donation.pickup_location)
  const ngoCoords = parsePoint(ngo.location)

  let distanceKm = 8.0 // sensible fallback in absence of valid coordinates
  if (donationCoords && ngoCoords && !(donationCoords.lat === 0 && donationCoords.lng === 0)) {
    distanceKm = calculateHaversineDistance(
      donationCoords.lat,
      donationCoords.lng,
      ngoCoords.lat,
      ngoCoords.lng
    )
  }

  // Check NGO operating radius
  const maxRadiusKm = ngo.operating_radius_km || 30
  if (distanceKm > maxRadiusKm) {
    return {
      eligible: false,
      distanceKm,
      travelTimeMinutes: 0,
      score: 0,
      scoreBreakdown: { proximityScore: 0, capacityScore: 0, reliabilityScore: 0, urgencyScore: 0 },
      reason: `Outside NGO operating radius (${distanceKm} km > ${maxRadiusKm} km)`,
    }
  }

  // 3. Time feasibility: travel time estimated at 25 km/h urban speed + 30 min preparation
  const travelTimeMinutes = Math.round((distanceKm / 25) * 60) + 30
  const arrivalTime = new Date(Date.now() + travelTimeMinutes * 60 * 1000)
  const expiryTime = new Date(donation.consume_before)

  if (arrivalTime >= expiryTime) {
    return {
      eligible: false,
      distanceKm,
      travelTimeMinutes,
      score: 0,
      scoreBreakdown: { proximityScore: 0, capacityScore: 0, reliabilityScore: 0, urgencyScore: 0 },
      reason: `Cannot reach before expiry (Arrival: ${arrivalTime.toLocaleTimeString()}, Expiry: ${expiryTime.toLocaleTimeString()})`,
    }
  }

  // 4. Scoring Algorithm (REQ-12)
  // Proximity (Max 35)
  let proximityScore = 10
  if (distanceKm <= 5) proximityScore = 35
  else if (distanceKm <= 10) proximityScore = 28
  else if (distanceKm <= 20) proximityScore = 20
  else if (distanceKm <= 35) proximityScore = 12

  // Capacity Compatibility (Max 25)
  let capacityScore = 20
  if (ngo.capacity_meals && donation.meals_estimate) {
    if (ngo.capacity_meals >= donation.meals_estimate) {
      capacityScore = 25
    } else {
      capacityScore = Math.max(5, Math.round((ngo.capacity_meals / donation.meals_estimate) * 20))
    }
  }

  // Historical Reliability (Max 25)
  const relScore = await getOrganizationReliability(ngo.id, 'NGO')
  const reliabilityScore = Math.round((relScore / 100) * 25)

  // Urgency Feasibility (Max 15)
  const remainingHours = (expiryTime.getTime() - Date.now()) / (3600 * 1000)
  let urgencyScore = 15
  if (remainingHours <= 3) urgencyScore = 12
  else if (remainingHours <= 6) urgencyScore = 14

  const totalScore = Math.min(100, proximityScore + capacityScore + reliabilityScore + urgencyScore)

  return {
    eligible: true,
    distanceKm,
    travelTimeMinutes,
    score: totalScore,
    scoreBreakdown: {
      proximityScore,
      capacityScore,
      reliabilityScore,
      urgencyScore,
    },
  }
}

/**
 * Triggers the intelligent matching engine for a newly created or rematched donation (REQ-11 through REQ-14).
 * Finds eligible verified NGOs, ranks them by feasibility & score, persists matches, and notifies them.
 */
export async function triggerMatchingEngine(donationId: string): Promise<{ matchedCount: number; topScore: number }> {
  const supabase = createAdminClient()

  // 1. Fetch donation details
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .select('*')
    .eq('id', donationId)
    .single()

  if (donationError || !donation) {
    console.error('Failed to fetch donation for matching', donationError)
    return { matchedCount: 0, topScore: 0 }
  }

  // Verify donation is still in a matchable state and not expired
  if (new Date(donation.consume_before) <= new Date()) {
    console.log(`Donation ${donationId} is already expired. Skipping matching.`)
    await supabase.from('donations').update({ status: 'EXPIRED' }).eq('id', donationId)
    return { matchedCount: 0, topScore: 0 }
  }

  // 2. Fetch all verified NGOs
  const { data: ngos, error: ngosError } = await supabase
    .from('organizations')
    .select('*')
    .eq('type', 'NGO')
    .eq('verification_status', 'VERIFIED')

  if (ngosError || !ngos || ngos.length === 0) {
    console.log('No verified NGOs available for matching.')
    return { matchedCount: 0, topScore: 0 }
  }

  // 3. Evaluate eligibility and score each candidate
  const candidates: { ngo: OrganizationRow; eval: MatchEvaluation }[] = []

  for (const ngo of ngos) {
    const evaluation = await evaluateNgoEligibility(ngo, donation)
    if (evaluation.eligible) {
      candidates.push({ ngo, eval: evaluation })
    }
  }

  // Sort descending by match score
  candidates.sort((a, b) => b.eval.score - a.eval.score)

  if (candidates.length === 0) {
    console.log(`No eligible NGOs found for donation ${donation.id}`)
    return { matchedCount: 0, topScore: 0 }
  }

  // Take top candidates (up to 3 eligible NGOs) to match and notify
  const topCandidates = candidates.slice(0, 3)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins window

  let matchedCount = 0
  for (const candidate of topCandidates) {
    // Check if match already exists for this donation and NGO
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('donation_id', donation.id)
      .eq('ngo_id', candidate.ngo.id)
      .maybeSingle()

    if (!existingMatch) {
      const { data: matchRecord, error: matchError } = await supabase
        .from('matches')
        .insert({
          donation_id: donation.id,
          ngo_id: candidate.ngo.id,
          status: 'PENDING',
          score: candidate.eval.score,
          score_breakdown: {
            distanceKm: candidate.eval.distanceKm,
            travelTimeMinutes: candidate.eval.travelTimeMinutes,
            ...candidate.eval.scoreBreakdown,
          },
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (!matchError && matchRecord) {
        matchedCount++

        // Create in-app notification for NGO members
        const { data: members } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', candidate.ngo.id)

        if (members) {
          for (const m of members) {
            await sendNotification({
              userId: m.user_id,
              type: 'MATCH_FOUND',
              title: `Surplus Match: ${donation.food_name}`,
              message: `${donation.quantity} ${donation.quantity_unit} (${donation.meals_estimate} meals) available ~${candidate.eval.distanceKm} km away. Claim before expiry!`,
              channels: ['in-app'],
            })
          }
        }
      }
    }
  }

  // Update donation status to MATCHED if at least one match was established
  if (matchedCount > 0) {
    await supabase.from('donations').update({ status: 'MATCHED' }).eq('id', donation.id)
  }

  return {
    matchedCount,
    topScore: topCandidates[0]?.eval.score || 0,
  }
}
