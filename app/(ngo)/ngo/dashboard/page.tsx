import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, MapPin, Truck, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export default async function NgoDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'NGO') {
    redirect('/login')
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  const { data: memberData } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!memberData) {
    return (
      <div className="p-12 text-center text-gray-500">
        Please complete your organization registration first.
      </div>
    )
  }

  // Fetch real metrics
  const { count: pendingMatchesCount } = await adminClient.from('matches').select('*', { count: 'exact', head: true }).eq('ngo_id', memberData.organization_id).eq('status', 'PENDING')
  const { count: upcomingPickupsCount } = await adminClient.from('pickups').select('*, match:matches!inner(ngo_id)', { count: 'exact', head: true }).eq('match.ngo_id', memberData.organization_id).in('status', ['SCHEDULED', 'CONFIRMED', 'ON_THE_WAY'])
  
  // Recent Matches
  const { data: recentMatches } = await adminClient
    .from('matches')
    .select(`
      id,
      score,
      created_at,
      donation:donations(food_name, quantity, quantity_unit)
    `)
    .eq('ngo_id', memberData.organization_id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(3) as any

  const { data: orgData } = await adminClient.from('organizations').select('verification_status').eq('id', memberData.organization_id).single()

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome & Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">NGO Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back. Your organization is 
            {orgData?.verification_status === 'VERIFIED' ? (
              <span className="text-green-600 font-medium inline-flex items-center ml-1"><CheckCircle2 className="w-4 h-4 mr-1"/> Verified</span>
            ) : (
              <span className="text-yellow-600 font-medium inline-flex items-center ml-1"><AlertCircle className="w-4 h-4 mr-1"/> {orgData?.verification_status}</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Available Matches</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{pendingMatchesCount || 0}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Upcoming Pickups</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{upcomingPickupsCount || 0}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Food Received (Total)</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-foreground">0 kg</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Reliability Score</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-primary">100%</dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recommended Matches Table */}
        <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-4 sm:px-6 border-b border-border bg-muted/30 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-foreground flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-primary" />
              Recommended Matches
            </h3>
            <Link href="/ngo/donations" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="flex-1 p-0">
            {!recentMatches || recentMatches.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <p>No new matches available right now.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentMatches.map((m: any) => (
                  <li key={m.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                    <div>
                      {/* @ts-ignore */}
                      <p className="text-sm font-medium text-gray-900">{m.donation?.food_name}</p>
                      {/* @ts-ignore */}
                      <p className="text-xs text-gray-500">{m.donation?.quantity} {m.donation?.quantity_unit} • Score {m.score}%</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Upcoming Pickups */}
        <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-4 sm:px-6 border-b border-border bg-muted/30">
            <h3 className="text-base font-semibold leading-6 text-foreground flex items-center">
              <Truck className="w-5 h-5 mr-2 text-primary" />
              Upcoming Pickups
            </h3>
          </div>
          <div className="p-6 text-center text-sm text-muted-foreground flex-1 flex items-center justify-center">
            <p>No scheduled pickups.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
