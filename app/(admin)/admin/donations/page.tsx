import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Package, Search, Clock, AlertTriangle, Building2, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDonationsPage(props: {
  searchParams?: Promise<{
    query?: string
    status?: string
    urgency?: string
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
  const urgencyFilter = searchParams?.urgency || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 10

  let dbQuery = adminClient
    .from('donations')
    .select(`
      id,
      food_name,
      quantity,
      quantity_unit,
      meals_estimate,
      food_type,
      status,
      urgency,
      created_at,
      consume_before,
      pickup_address,
      provider:organizations!provider_id(id, name, city),
      category:donation_categories(name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (query) {
    dbQuery = dbQuery.ilike('food_name', `%${query}%`)
  }

  if (statusFilter) {
    dbQuery = dbQuery.eq('status', statusFilter as any)
  }

  if (urgencyFilter) {
    dbQuery = dbQuery.eq('urgency', urgencyFilter as any)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: donations, error, count } = await dbQuery.range(from, to)
  const totalItems = count || 0
  const pageCount = Math.ceil(totalItems / pageSize)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Donations & Allocations</h1>
          <p className="text-sm text-gray-500 mt-1">
            System-wide oversight of surplus food listings, expiry tracking, and allocation lifecycle.
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
            placeholder="Search food name..."
            className="pl-9 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          {urgencyFilter && <input type="hidden" name="urgency" value={urgencyFilter} />}
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <form className="flex items-center gap-2">
            {query && <input type="hidden" name="query" value={query} />}
            <AutoSubmitSelect
              name="status"
              defaultValue={statusFilter}
              className="rounded-lg border-gray-200 shadow-xs focus:border-emerald-500 text-xs py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="MATCHED">Matched</option>
              <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="DELIVERED">Delivered</option>
              <option value="DISTRIBUTED">Distributed</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </AutoSubmitSelect>

            <AutoSubmitSelect
              name="urgency"
              defaultValue={urgencyFilter}
              className="rounded-lg border-gray-200 shadow-xs focus:border-emerald-500 text-xs py-1.5"
            >
              <option value="">All Urgencies</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      {/* Donations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-500 text-sm">Failed to load donations.</div>
        ) : !donations || donations.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No donations matching criteria</h3>
            <p className="text-xs text-gray-400 mt-1">Try resetting search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-50/70 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left">Food Details</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Provider Org</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Quantity</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Urgency</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Expiry</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left">Listed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {donations.map((d: any) => {
                  const isExp = new Date(d.consume_before) <= new Date()

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 pl-6 pr-3 font-semibold text-gray-900">
                        <div>
                          <span>{d.food_name}</span>
                          <span className="text-[10px] text-gray-400 block font-normal">
                            {d.category?.name || 'General'} • {d.food_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-gray-700">
                        <span className="font-semibold">{d.provider?.name}</span>
                        <span className="text-[10px] text-gray-400 block">{d.provider?.city || 'India'}</span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-800 font-bold">
                        {d.quantity} {d.quantity_unit}
                        <span className="text-[10px] text-gray-400 font-normal block">~{d.meals_estimate} meals</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.urgency === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : d.urgency === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {d.urgency}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-600">
                        <span>{format(new Date(d.consume_before), 'PPp')}</span>
                        {isExp && <span className="text-[10px] text-red-600 font-bold block">Past Expiry</span>}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === 'AVAILABLE'
                              ? 'bg-amber-100 text-amber-800'
                              : d.status === 'MATCHED'
                              ? 'bg-blue-100 text-blue-800'
                              : ['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(d.status)
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-500 whitespace-nowrap">
                        {format(new Date(d.created_at), 'MMM d, yyyy')}
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
