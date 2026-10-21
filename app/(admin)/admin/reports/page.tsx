import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsDashboard } from './ReportsDashboard'
import { getLiveAnalyticsData } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch 100% live analytics data directly on request
  const analyticsData = await getLiveAnalyticsData()

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <ReportsDashboard initialData={analyticsData} />
    </div>
  )
}


