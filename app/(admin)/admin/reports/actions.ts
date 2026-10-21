'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { AnalyticsData } from './ReportsDashboard'

export async function getLiveAnalyticsData(): Promise<AnalyticsData> {
  const adminClient = createAdminClient()

  // Fetch all donations and organizations in parallel with latest live state
  const [donationsRes, orgsRes] = await Promise.all([
    adminClient
      .from('donations')
      .select('id, status, meals_estimate, quantity, quantity_unit, created_at')
      .order('created_at', { ascending: false }),
    adminClient
      .from('organizations')
      .select('id, name, type, city, verification_status')
  ])

  const donations = donationsRes.data || []
  const orgs = orgsRes.data || []

  // 1. KPI Totals
  const totalDonations = donations.length
  const totalMeals = donations.reduce((sum, d) => sum + (d.meals_estimate || 0), 0)
  const availableDonations = donations.filter(d => d.status === 'AVAILABLE').length
  const deliveredDonations = donations.filter(d => d.status === 'DELIVERED').length

  const totalPartners = orgs.length
  const verifiedPartners = orgs.filter(o => o.verification_status === 'VERIFIED').length
  const underReviewPartners = orgs.filter(o => o.verification_status === 'UNDER_REVIEW').length
  const pendingPartners = orgs.filter(o => o.verification_status === 'PENDING').length
  const rejectedPartners = orgs.filter(o => o.verification_status === 'REJECTED').length

  // 2. Verification Status Distribution
  const verificationDistribution = [
    {
      label: 'Verified Active',
      value: verifiedPartners,
      percentage: totalPartners > 0 ? (verifiedPartners / totalPartners) * 100 : 0,
      color: '#10b981', // emerald
      badgeBg: '#ecfdf5',
      textColor: '#047857'
    },
    {
      label: 'Under Review',
      value: underReviewPartners,
      percentage: totalPartners > 0 ? (underReviewPartners / totalPartners) * 100 : 0,
      color: '#3b82f6', // blue
      badgeBg: '#eff6ff',
      textColor: '#1d4ed8'
    },
    {
      label: 'Pending Approval',
      value: pendingPartners,
      percentage: totalPartners > 0 ? (pendingPartners / totalPartners) * 100 : 0,
      color: '#f59e0b', // amber
      badgeBg: '#fffbeb',
      textColor: '#b45309'
    },
    {
      label: 'Rejected',
      value: rejectedPartners,
      percentage: totalPartners > 0 ? (rejectedPartners / totalPartners) * 100 : 0,
      color: '#f43f5e', // rose
      badgeBg: '#fff1f2',
      textColor: '#be123c'
    }
  ]

  // 3. Organization Sector Distribution
  const sectorCounts: Record<string, number> = {}
  orgs.forEach(o => {
    const rawType = o.type || 'OTHER'
    sectorCounts[rawType] = (sectorCounts[rawType] || 0) + 1
  })

  const sectorConfigs = [
    { key: 'NGO', label: 'NGOs & Non-Profits', color: '#8b5cf6', badgeBg: '#f5f3ff', textColor: '#6d28d9' },
    { key: 'RESTAURANT', label: 'Restaurants & Cafes', color: '#06b6d4', badgeBg: '#ecfeff', textColor: '#0e7490' },
    { key: 'OTHER', label: 'Food Outlets & Others', color: '#64748b', badgeBg: '#f8fafc', textColor: '#334155' },
    { key: 'CATERER', label: 'Caterers & Kitchens', color: '#f97316', badgeBg: '#fff7ed', textColor: '#c2410c' },
    { key: 'EVENT_ORGANIZER', label: 'Event Organizers', color: '#ec4899', badgeBg: '#fdf2f8', textColor: '#be185d' },
    { key: 'HOTEL', label: 'Hotels & Banquets', color: '#eab308', badgeBg: '#fefce8', textColor: '#a16207' },
  ]

  const sectorDistribution = sectorConfigs.map(s => {
    const count = sectorCounts[s.key] || 0
    return {
      label: s.label,
      value: count,
      percentage: totalPartners > 0 ? (count / totalPartners) * 100 : 0,
      color: s.color,
      badgeBg: s.badgeBg,
      textColor: s.textColor
    }
  })

  // 4. Monthly Trends
  const monthlyAgg: Record<string, { count: number; meals: number; delivered: number }> = {}
  donations.forEach(d => {
    if (!d.created_at) return
    const ym = d.created_at.substring(0, 7) // YYYY-MM
    if (!monthlyAgg[ym]) monthlyAgg[ym] = { count: 0, meals: 0, delivered: 0 }
    monthlyAgg[ym].count++
    monthlyAgg[ym].meals += (d.meals_estimate || 0)
    if (d.status === 'DELIVERED') monthlyAgg[ym].delivered++
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const sortedMonths = Object.keys(monthlyAgg).sort()
  const recentMonths = sortedMonths.slice(-10)

  const monthlyTrends = recentMonths.map(ym => {
    const [year, monthNum] = ym.split('-')
    const mLabel = `${monthNames[parseInt(monthNum, 10) - 1]} '${year.slice(2)}`
    return {
      month: ym,
      monthLabel: mLabel,
      donations: monthlyAgg[ym].count,
      meals: monthlyAgg[ym].meals,
      delivered: monthlyAgg[ym].delivered
    }
  })

  // 5. Regional Hubs (Top 10 Cities)
  const cityCounts: Record<string, number> = {}
  orgs.forEach(o => {
    if (o.city) {
      cityCounts[o.city] = (cityCounts[o.city] || 0) + 1
    }
  })

  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({
      city,
      count,
      percentage: totalPartners > 0 ? (count / totalPartners) * 100 : 0
    }))

  return {
    totalMeals,
    totalDonations,
    availableDonations,
    deliveredDonations,
    totalPartners,
    verifiedPartners,
    underReviewPartners,
    pendingPartners,
    rejectedPartners,
    verificationDistribution,
    sectorDistribution,
    monthlyTrends,
    topCities
  }
}
