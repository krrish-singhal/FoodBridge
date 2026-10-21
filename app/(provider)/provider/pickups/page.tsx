import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Truck, Clock, MapPin, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ProviderPickupActions } from './ProviderPickupActions'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProviderPickupsPage(
  props: {
    searchParams?: Promise<{
      status?: string
      page?: string
    }>
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'PROVIDER') {
    redirect('/login')
  }

  const adminClient = createAdminClient()
  const { data: memberData } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!memberData) return <div className="p-12 text-center">Unauthorized</div>

  const searchParams = await props.searchParams
  const statusFilter = searchParams?.status || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 10

  // Fetch Pickups for this provider's donations
  let dbQuery = adminClient
    .from('pickups')
    .select(`
      id,
      status,
      scheduled_time,
      coordinator_name,
      coordinator_phone,
      vehicle_details,
      created_at,
      match:matches!inner(
        id,
        donation:donations!inner(id, food_name, quantity, quantity_unit, meals_estimate, provider_id),
        ngo:organizations!ngo_id(id, name)
      ),
      proof:pickup_proof(id)
    `, { count: 'exact' })
    .eq('match.donation.provider_id', memberData.organization_id)
    .order('scheduled_time', { ascending: false })

  if (statusFilter) {
    dbQuery = dbQuery.eq('status', statusFilter as any)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: pickups, error, count } = await dbQuery.range(from, to)
  const totalItems = count || 0
  const pageCount = Math.ceil(totalItems / pageSize)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Food Handover & OTP Verification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Validate incoming NGO collection teams using their 6-digit verification code.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Handover Queue</h3>
        <div className="flex gap-2 w-full sm:w-auto ml-auto">
          <form className="flex items-center gap-2">
            <AutoSubmitSelect
              name="status"
              defaultValue={statusFilter}
              className="rounded-lg border-gray-200 shadow-xs focus:border-emerald-500 focus:ring-emerald-500 text-xs py-1.5"
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

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
        {!pickups || pickups.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No scheduled pickups</h3>
            <p className="text-xs text-gray-400 mt-1">When an NGO claims your food, their pickup will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pickups.map((pickup: any) => {
              const d = pickup.match?.donation
              const ngo = pickup.match?.ngo
              const hasProof = pickup.proof && pickup.proof.length > 0

              return (
                <li key={pickup.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-bold text-gray-900">{d?.food_name}</h4>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            pickup.status === 'SCHEDULED'
                              ? 'bg-blue-100 text-blue-800'
                              : ['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(pickup.status)
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {pickup.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        NGO: <strong className="text-gray-800">{ngo?.name}</strong> • Quantity: {d?.quantity} {d?.quantity_unit} (~{d?.meals_estimate} meals)
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {format(new Date(pickup.scheduled_time), 'PPp')}
                        </span>
                        <span>
                          Coordinator: <strong>{pickup.coordinator_name}</strong> ({pickup.coordinator_phone})
                        </span>
                        {pickup.vehicle_details && <span>Transport: {pickup.vehicle_details}</span>}
                      </div>
                    </div>

                    <ProviderPickupActions
                      pickupId={pickup.id}
                      matchId={pickup.match?.id}
                      ngoOrgId={ngo?.id}
                      ngoName={ngo?.name || 'Partner NGO'}
                      pickupStatus={pickup.status}
                      hasProof={hasProof}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {pickups && pickups.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2">
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
