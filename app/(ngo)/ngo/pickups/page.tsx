import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Truck, Clock, MapPin, Search, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { SchedulePickupForm } from './SchedulePickupForm'
import { NgoPickupActions } from './NgoPickupActions'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NgoPickupsPage(
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

  if (!memberData) return <div className="p-12 text-center">Unauthorized</div>

  // 1. Fetch ACCEPTED matches that don't have a pickup scheduled yet
  const { data: acceptedMatches } = await adminClient
    .from('matches')
    .select(`
      id, created_at,
      donation:donations(id, food_name, quantity, quantity_unit, pickup_address, consume_before, provider:organizations(id, name)),
      pickups(id)
    `)
    .eq('ngo_id', memberData.organization_id)
    .eq('status', 'ACCEPTED')
    .order('created_at', { ascending: false }) as any

  const needsScheduling = acceptedMatches?.filter((m: any) => !m.pickups || m.pickups.length === 0) || []

  const searchParams = await props.searchParams
  const statusFilter = searchParams?.status || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 10

  // 2. Fetch Pickups with OTP and Donation details
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
        ngo_id,
        donation:donations(
          id,
          food_name,
          quantity,
          quantity_unit,
          meals_estimate,
          pickup_address,
          status,
          provider:organizations(id, name)
        )
      ),
      otp:pickup_otp(
        otp_hash,
        expires_at,
        is_used
      )
    `, { count: 'exact' })
    .eq('match.ngo_id', memberData.organization_id)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NGO Pickup Coordination</h1>
        <p className="text-sm text-gray-500 mt-1">
          Coordinate designated collection staff, view handover OTPs, and record delivery milestones.
        </p>
      </div>

      {needsScheduling.length > 0 && (
        <div className="bg-white shadow-sm sm:rounded-xl overflow-hidden border border-amber-200">
          <div className="px-5 py-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-900">Requires Pickup Scheduling ({needsScheduling.length})</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                These donations have been accepted. Please assign a coordinator and planned pickup time.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
              Action Required
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {needsScheduling.map((match: any) => {
              const d = match.donation
              return (
                <li key={match.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-gray-900">{d?.food_name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Donor: <strong className="text-gray-700">{d?.provider?.name}</strong> • Quantity: {d?.quantity} {d?.quantity_unit}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <MapPin className="inline w-3.5 h-3.5 mr-1 text-gray-400" /> {d?.pickup_address}
                      </p>
                    </div>
                  </div>
                  <SchedulePickupForm matchId={match.id} foodName={d?.food_name || 'Food'} />
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Filter and Table Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">Active & Completed Pickups</h3>
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
            <p className="text-xs text-gray-400 mt-1">Pickups will appear here after claims are accepted and scheduled.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pickups.map((pickup: any) => {
              const d = pickup.match?.donation
              const provider = d?.provider
              const otp = pickup.otp

              return (
                <li key={pickup.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-bold text-gray-900">{d?.food_name}</h4>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            pickup.status === 'SCHEDULED'
                              ? 'bg-blue-100 text-blue-800'
                              : pickup.status === 'PICKED_UP'
                              ? 'bg-amber-100 text-amber-800'
                              : pickup.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {pickup.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        Donor: <strong className="text-gray-700">{provider?.name}</strong> • Quantity: {d?.quantity} {d?.quantity_unit} (~{d?.meals_estimate} meals)
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          Planned: {format(new Date(pickup.scheduled_time), 'PPp')}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {d?.pickup_address}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg inline-block mt-2">
                        <strong>Coordinator:</strong> {pickup.coordinator_name} ({pickup.coordinator_phone})
                        {pickup.vehicle_details && <span> • Vehicle: {pickup.vehicle_details}</span>}
                      </div>
                    </div>

                    <NgoPickupActions
                      pickupId={pickup.id}
                      matchId={pickup.match?.id}
                      providerOrgId={provider?.id}
                      providerName={provider?.name || 'Food Donor'}
                      pickupStatus={pickup.status}
                      donationStatus={d?.status || pickup.status}
                      otpCode={otp?.otp_hash}
                      otpExpiresAt={otp?.expires_at}
                      isOtpUsed={otp?.is_used}
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
