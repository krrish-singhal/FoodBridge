import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PackageSearch, Clock, ShieldCheck, Search } from 'lucide-react'
import { format } from 'date-fns'
import { MatchActions } from './MatchActions'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export default async function NgoDonationsPage(
  props: {
    searchParams?: Promise<{
      status?: string
      page?: string
    }>
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'NGO') {
    redirect('/login')
  }

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

  const searchParams = await props.searchParams
  const statusFilter = searchParams?.status || 'PENDING'
  const page = Number(searchParams?.page) || 1
  const pageSize = 10

  let dbQuery = adminClient
    .from('matches')
    .select(`
      id,
      status,
      score,
      expires_at,
      created_at,
      donation:donations(
        id, food_name, quantity, quantity_unit, meals_estimate, consume_before, urgency, pickup_address,
        provider:organizations(name)
      )
    `, { count: 'exact' })
    .eq('ngo_id', memberData.organization_id)
    .order('created_at', { ascending: false })
    
  if (statusFilter) {
    dbQuery = dbQuery.eq('status', statusFilter as any)
  }
  
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const { data: matches, error, count } = await dbQuery.range(from, to)
  const totalItems = count || 0
  const pageCount = Math.ceil(totalItems / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Food Matches</h1>
          <p className="text-sm text-gray-500 mt-1">Review food donations matched to your NGO.</p>
        </div>
      </div>

      <div className="bg-white p-4 shadow sm:rounded-lg flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto ml-auto">
          <form className="flex items-center gap-2">
            <AutoSubmitSelect
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-red-500">Failed to load matches.</div>
        ) : !matches || matches.length === 0 ? (
          <div className="p-12 text-center">
            <PackageSearch className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No active matches</h3>
            <p className="mt-1 text-sm text-gray-500">We will notify you when surplus food becomes available in your area.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {matches.map((match: any) => {
              // @ts-ignore
              const d = match.donation
              return (
                <li key={match.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {d?.food_name}
                        </h3>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium 
                          ${d?.urgency === 'CRITICAL' ? 'bg-red-100 text-red-800' : 
                            d?.urgency === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                          {d?.urgency} URGENCY
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-semibold block text-gray-700">Provider:</span>
                          {/* @ts-ignore */}
                          {d?.provider?.name}
                        </div>
                        <div>
                          <span className="font-semibold block text-gray-700">Quantity:</span>
                          {d?.quantity} {d?.quantity_unit} (~{d?.meals_estimate} meals)
                        </div>
                        <div>
                          <span className="font-semibold block text-gray-700">Pickup Address:</span>
                          {d?.pickup_address}
                        </div>
                        <div>
                          <span className="font-semibold block text-gray-700 flex items-center">
                            <Clock className="w-4 h-4 mr-1"/> Consume Before:
                          </span>
                          {d?.consume_before ? format(new Date(d.consume_before), 'PPp') : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        <ShieldCheck className="w-4 h-4 mr-1 text-green-500"/>
                        Match Score: {match.score}% • Expires in {Math.max(0, Math.round((new Date(match.expires_at).getTime() - Date.now()) / 60000))} mins
                      </div>
                    </div>
                    
                    <MatchActions matchId={match.id} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {matches && matches.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-2">
            <DataTablePagination
              pageCount={pageCount}
              totalItems={totalItems}
              currentPage={page}
              pageSize={pageSize}
            />
          </div>
        )}
      </div>
    </div>
  )
}
