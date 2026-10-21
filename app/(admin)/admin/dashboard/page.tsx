import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Activity, Users, ShieldAlert } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'ADMIN') {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  // Fetch real data
  const { count: verifiedCount } = await adminClient.from('organizations').select('*', { count: 'exact', head: true }).eq('verification_status', 'VERIFIED')
  const { count: pendingCount } = await adminClient.from('organization_verification').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'UNDER_REVIEW'])
  
  // Today's matches
  const today = new Date()
  today.setHours(0,0,0,0)
  const { count: matchesCount } = await adminClient.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
  
  const { count: failedPickupsCount } = await adminClient.from('pickups').select('*', { count: 'exact', head: true }).eq('status', 'FAILED')

  const { data: recentVerifications } = (await adminClient
    .from('organization_verification')
    .select('id, status, organization:organizations(name, type)')
    .in('status', ['PENDING', 'UNDER_REVIEW'])
    .order('created_at', { ascending: true })
    .limit(5)) as { data: any[] | null }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Platform Overview</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Verified Organizations</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{verifiedCount || 0}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Pending Verifications</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-amber-600">{pendingCount || 0}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Total Matches (Today)</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{matchesCount || 0}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-card border border-border shadow-sm">
          <div className="p-5">
            <dt className="truncate text-sm font-medium text-muted-foreground">Failed Pickups</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-destructive">{failedPickupsCount || 0}</dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-4 sm:px-6 border-b border-border bg-muted/30 flex justify-between items-center">
            <h3 className="text-base font-semibold leading-6 text-foreground flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" />
              Verification Queue
            </h3>
            <Link href="/admin/verifications" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="flex-1 p-0">
            {!recentVerifications || recentVerifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <p>No organizations pending verification.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentVerifications.map((v) => (
                  <li key={v.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                    <div>
                      {/* @ts-ignore */}
                      <p className="text-sm font-medium text-gray-900">{v.organization?.name}</p>
                      {/* @ts-ignore */}
                      <p className="text-xs text-gray-500">{v.organization?.type}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      {v.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-4 sm:px-6 border-b border-border bg-muted/30 flex items-center">
            <h3 className="text-base font-semibold leading-6 text-foreground flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary" />
              System Health
            </h3>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center items-center text-center text-sm text-muted-foreground">
            {failedPickupsCount && failedPickupsCount > 0 ? (
              <>
                <ShieldAlert className="w-12 h-12 text-destructive mb-3 mx-auto" />
                <p className="text-destructive font-medium">Alert: Failed Pickups Detected</p>
                <p className="mt-1">Review pickup logs to assist affected NGOs.</p>
              </>
            ) : (
              <>
                <Activity className="w-12 h-12 text-green-500 mb-3 mx-auto" />
                <p className="text-green-700 font-medium">All systems operational.</p>
                <p className="mt-1">No critical alerts requiring attention.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
