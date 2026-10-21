import Link from 'next/link'
import { PlusCircle, AlertCircle, CheckCircle2, Truck, MessageSquare, ArrowRight, Clock } from 'lucide-react'
import { getCurrentUser, getUserOrganizations } from '@/lib/auth/getUser'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { format, isBefore, addHours } from 'date-fns'
import { calculateHappyScore } from '@/lib/analytics/happy-score'
import { ProviderDashboardCharts } from './ProviderDashboardCharts'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProviderDashboard(props: {
  searchParams?: Promise<{ dateRange?: string }>
}) {
  const { user } = (await getCurrentUser()) || {}
  if (!user) redirect('/login')

  const orgs = await getUserOrganizations(user.id)
  const org = orgs[0]

  if (!org) {
    return (
      <div className="p-12 text-center text-gray-500">
        Please complete your organization registration first.
      </div>
    )
  }

  const searchParams = await props.searchParams
  const dateRange = searchParams?.dateRange || 'all'

  const adminClient = createAdminClient()

  // 1. Fetch all donations belonging to this provider
  const { data: donations } = await adminClient
    .from('donations')
    .select(`
      id,
      food_name,
      meals_estimate,
      quantity,
      quantity_unit,
      status,
      consume_before,
      urgency,
      created_at,
      category:donation_categories(name)
    `)
    .eq('provider_id', org.id)
    .order('created_at', { ascending: false })

  const safeDonations = (donations || []) as any[]

  // Format donations for chart component
  const chartDonations = safeDonations.map(d => ({
    id: d.id,
    food_name: d.food_name,
    meals_estimate: d.meals_estimate,
    quantity: d.quantity,
    quantity_unit: d.quantity_unit,
    status: d.status,
    created_at: d.created_at,
    category_name: d.category?.name || 'Cooked Food',
  }))

  // 2. Fetch Happy Score
  const happyScore = await calculateHappyScore(org.id)

  // 3. Fetch pickups
  const { data: pickupsData } = await adminClient
    .from('pickups')
    .select(`
      id,
      status,
      scheduled_time,
      coordinator_name,
      coordinator_phone,
      matches!inner (
        id,
        donation_id,
        donations!inner (
          provider_id,
          food_name,
          meals_estimate
        ),
        ngo_id,
        organizations!ngo_id (
          name
        )
      )
    `)
    .eq('matches.donations.provider_id', org.id)
    .order('scheduled_time', { ascending: true })

  const safePickups = (pickupsData || []) as any[]

  // 4. Fetch Active Matches & Requests
  const { data: activeMatchesData } = await adminClient
    .from('matches')
    .select(`
      id,
      status,
      score,
      expires_at,
      created_at,
      donations!inner (
        provider_id,
        food_name,
        meals_estimate
      ),
      organizations!ngo_id (
        id,
        name,
        verification_status
      )
    `)
    .eq('donations.provider_id', org.id)
    .in('status', ['PENDING', 'NOTIFIED', 'ACCEPTED'])
    .order('created_at', { ascending: false })

  const activeMatches = (activeMatchesData || []) as any[]

  // Urgent expirations: within next 24 hours and still AVAILABLE
  const now = new Date()
  const criticalExpirations = safeDonations.filter(
    d => d.status === 'AVAILABLE' && isBefore(new Date(d.consume_before), addHours(now, 24))
  )

  const upcomingPickups = safePickups
    .filter(p => ['SCHEDULED', 'CONFIRMED', 'ON_THE_WAY'].includes(p.status))
    .slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
            {org.verification_status === 'VERIFIED' ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified Donor
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> {org.verification_status}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {org.name} • Surplus Food Recovery & NGO Distribution
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Link
            href="/provider/messages"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50"
          >
            <MessageSquare className="mr-2 h-4 w-4 text-gray-500" />
            Messages
          </Link>
          <Link
            href="/provider/donations/new"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            List Surplus Food
          </Link>
        </div>
      </div>

      {/* Interactive Charts & Analytics Section */}
      <ProviderDashboardCharts
        donations={chartDonations}
        happyScore={happyScore}
        orgName={org.name}
        dateRange={dateRange}
      />

      {/* Operational Columns: Urgent Expirations, Matches, and Pickups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Actions Required */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
              Expiring Batches ({criticalExpirations.length})
            </h3>
            <span className="text-xs font-medium text-amber-800">Needs Claim</span>
          </div>
          <div className="p-4 flex-1">
            {criticalExpirations.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No batches currently facing imminent expiry.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {criticalExpirations.slice(0, 4).map(d => (
                  <li key={d.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{d.food_name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {d.meals_estimate} meals • Expires {format(new Date(d.consume_before), 'h:mm a, MMM d')}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                      Urgent
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Active Matches / NGO Requests */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              Active NGO Matches ({activeMatches.length})
            </h3>
            <Link href="/provider/donations" className="text-xs font-semibold text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="p-4 flex-1">
            {activeMatches.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No active match requests pending.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activeMatches.slice(0, 4).map(m => {
                  const anyMatch = m as any
                  return (
                    <li key={m.id} className="py-3 flex justify-between items-start text-xs">
                      <div>
                        <p className="font-semibold text-gray-800">{anyMatch.donations?.food_name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Matched with {anyMatch.organizations?.name || 'Verified NGO'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[10px]">
                        {m.status}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Scheduled Pickups */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 bg-emerald-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <Truck className="w-4 h-4 mr-2 text-emerald-600" />
              Scheduled Pickups ({upcomingPickups.length})
            </h3>
            <Link href="/provider/pickups" className="text-xs font-semibold text-emerald-700 hover:underline">
              Enter OTP
            </Link>
          </div>
          <div className="p-4 flex-1">
            {upcomingPickups.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No pickups currently in transit.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingPickups.map(p => {
                  const anyP = p as any
                  return (
                    <li key={p.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {anyP.matches?.donations?.food_name} ({anyP.matches?.donations?.meals_estimate} meals)
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          NGO: {anyP.matches?.organizations?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">
                          {format(new Date(p.scheduled_time), 'h:mm a')}
                        </p>
                        <Link
                          href="/provider/pickups"
                          className="text-[10px] text-emerald-700 font-semibold hover:underline inline-flex items-center"
                        >
                          Verify Handover <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
