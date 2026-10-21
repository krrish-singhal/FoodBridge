import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Truck, Search, Clock, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminPickupsPage(props: {
  searchParams?: Promise<{
    query?: string
    status?: string
    page?: string
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'ADMIN') {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const statusFilter = searchParams?.status || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 10

  let dbQuery = adminClient
    .from('pickups')
    .select(`
      id,
      status,
      scheduled_time,
      coordinator_name,
      coordinator_phone,
      vehicle_details,
      failure_reason,
      created_at,
      match:matches!inner(
        id,
        donation:donations!inner(id, food_name, quantity, quantity_unit, meals_estimate, pickup_address, provider:organizations!provider_id(name, city)),
        ngo:organizations!ngo_id(id, name, city)
      )
    `, { count: 'exact' })
    .order('scheduled_time', { ascending: false })

  if (query) {
    dbQuery = dbQuery.or(`coordinator_name.ilike.%${query}%,vehicle_details.ilike.%${query}%`)
  }

  if (statusFilter) {
    dbQuery = dbQuery.eq('status', statusFilter as any)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: pickups, error, count } = await dbQuery.range(from, to)
  const totalItems = count || 0
  const pageCount = Math.ceil(totalItems / pageSize)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Pickups & Handovers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time logistical coordination, OTP verification records, and exception tracking.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form className="flex-1 w-full sm:max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Search coordinator or vehicle..."
            className="pl-9 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <form className="flex items-center gap-2">
            {query && <input type="hidden" name="query" value={query} />}
            <AutoSubmitSelect
              name="status"
              defaultValue={statusFilter}
              className="rounded-lg border-gray-200 shadow-xs focus:border-emerald-500 text-xs py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ON_THE_WAY">On The Way</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      {/* Pickups Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-500 text-sm">Failed to load pickups.</div>
        ) : !pickups || pickups.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No pickups matching criteria</h3>
            <p className="text-xs text-gray-400 mt-1">Try resetting search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50/70 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left">Food Batch</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Donor (Provider)</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Collector (NGO)</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Coordinator Contact</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Scheduled Time</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {pickups.map((p: any) => {
                  const d = p.match?.donation
                  const provider = d?.provider
                  const ngo = p.match?.ngo

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 pl-6 pr-3 font-semibold text-gray-900">
                        <div>
                          <span>{d?.food_name}</span>
                          <span className="text-[10px] text-gray-400 block font-normal">
                            {d?.quantity} {d?.quantity_unit} (~{d?.meals_estimate} meals)
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-gray-700">
                        <span className="font-semibold">{provider?.name}</span>
                        <span className="text-[10px] text-gray-400 block">{provider?.city}</span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-700">
                        <span className="font-semibold text-emerald-800">{ngo?.name}</span>
                        <span className="text-[10px] text-gray-400 block">{ngo?.city}</span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-800">
                        <span className="font-semibold">{p.coordinator_name}</span>
                        <span className="text-[10px] text-gray-500 block">{p.coordinator_phone}</span>
                        {p.vehicle_details && (
                          <span className="text-[10px] text-gray-400 block">Vehicle: {p.vehicle_details}</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 whitespace-nowrap">
                        {format(new Date(p.scheduled_time), 'PPp')}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'SCHEDULED'
                              ? 'bg-blue-100 text-blue-800'
                              : p.status === 'PICKED_UP'
                              ? 'bg-amber-100 text-amber-800'
                              : p.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.failure_reason && (
                          <span className="text-[10px] text-red-600 block mt-0.5 truncate max-w-xs" title={p.failure_reason}>
                            {p.failure_reason}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="border-t border-gray-100 px-4 py-2">
              <DataTablePagination
                pageCount={pageCount}
                totalItems={totalItems}
                currentPage={page}
                pageSize={pageSize}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
