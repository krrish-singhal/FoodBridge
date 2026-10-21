import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Utensils,
  ShieldCheck,
  Building2,
  MessageSquare,
  Truck,
  Sparkles,
} from 'lucide-react'
import { format } from 'date-fns'
import { ProviderMatchActions } from './ProviderMatchActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProviderDonationDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()

  // 1. Fetch donation details
  const { data: donation, error } = await adminClient
    .from('donations')
    .select(`
      id,
      food_name,
      quantity,
      quantity_unit,
      meals_estimate,
      food_type,
      prepared_at,
      consume_before,
      pickup_address,
      description,
      status,
      urgency,
      created_at,
      provider:organizations(id, name, verification_status, phone, email),
      category:donation_categories(name)
    `)
    .eq('id', id)
    .single() as any

  if (error || !donation) {
    notFound()
  }

  // 2. Fetch safety checklist and allergens
  const { data: safety } = await adminClient
    .from('donation_safety_checklists')
    .select('*')
    .eq('donation_id', id)
    .maybeSingle()

  const { data: allergens } = await adminClient
    .from('donation_allergens')
    .select('allergen')
    .eq('donation_id', id)

  // 3. Fetch matches for this donation
  const { data: matches } = await adminClient
    .from('matches')
    .select(`
      id,
      status,
      score,
      score_breakdown,
      expires_at,
      created_at,
      ngo:organizations!ngo_id(
        id,
        name,
        type,
        city,
        state,
        verification_status,
        capacity_meals,
        phone,
        email
      )
    `)
    .eq('donation_id', id)
    .order('score', { ascending: false }) as any

  // 4. Fetch pickups if scheduled
  const { data: pickups } = await adminClient
    .from('pickups')
    .select(`
      id,
      status,
      scheduled_time,
      coordinator_name,
      coordinator_phone,
      vehicle_details,
      created_at,
      match:matches!inner(donation_id)
    `)
    .eq('match.donation_id', id)
    .maybeSingle() as any

  const isExpired = new Date(donation.consume_before) <= new Date()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/provider/donations"
          className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Donations
        </Link>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            donation.status === 'AVAILABLE'
              ? 'bg-amber-100 text-amber-800'
              : donation.status === 'MATCHED'
              ? 'bg-blue-100 text-blue-800'
              : donation.status === 'PICKUP_SCHEDULED'
              ? 'bg-purple-100 text-purple-800'
              : ['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(donation.status)
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          Status: {donation.status}
        </span>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">{donation.food_name}</h1>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                {donation.food_type}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Category: {donation.category?.name || 'Cooked Meals'} • Listed on{' '}
              {format(new Date(donation.created_at), 'PPP')}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Quantity</span>
              <span className="text-xl font-extrabold text-emerald-700">
                {donation.quantity} {donation.quantity_unit} (~{donation.meals_estimate} meals)
              </span>
            </div>
          </div>
        </div>

        {/* Key Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1" /> Consume Before
            </span>
            <p className="mt-1 font-bold text-sm text-gray-800">
              {format(new Date(donation.consume_before), 'PPp')}
            </p>
            {isExpired && (
              <span className="text-[10px] text-red-600 font-bold block mt-0.5">Expired</span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1" /> Pickup Location
            </span>
            <p className="mt-1 font-bold text-sm text-gray-800 truncate" title={donation.pickup_address}>
              {donation.pickup_address}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Safety Compliance
            </span>
            <p className="mt-1 font-bold text-sm text-emerald-700 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
              {safety?.proper_storage && safety?.safe_packaging && safety?.temp_controlled
                ? 'Verified Compliant'
                : 'Pending Declaration'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Urgency Level
            </span>
            <p className="mt-1 font-bold text-sm text-gray-800">{donation.urgency}</p>
          </div>
        </div>

        {/* Description & Allergens */}
        <div className="space-y-3 pt-2">
          {donation.description && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description & Handling</h3>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed bg-gray-50 p-3 rounded-lg">
                {donation.description}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Allergens Declared</h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {!allergens || allergens.length === 0 ? (
                <span className="text-xs text-gray-400 italic">No allergens declared.</span>
              ) : (
                allergens.map((a: any, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    {a.allergen}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Pickup Section (if scheduled) */}
      {pickups && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-gray-900">Scheduled Pickup In Progress</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
              Status: {pickups.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-semibold text-gray-500 block">Scheduled Time</span>
              <span className="text-sm font-bold text-gray-800 mt-0.5 block">
                {format(new Date(pickups.scheduled_time), 'PPp')}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block">Responsible Coordinator</span>
              <span className="text-sm font-bold text-gray-800 mt-0.5 block">
                {pickups.coordinator_name} ({pickups.coordinator_phone})
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-500 block">Vehicle Reference</span>
              <span className="text-sm font-bold text-gray-800 mt-0.5 block">
                {pickups.vehicle_details || 'Standard Transport'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              href="/provider/pickups"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
            >
              Go to Pickups & Verify 6-Digit OTP
            </Link>
          </div>
        </div>
      )}

      {/* Matching Candidates & Incoming Requests */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-emerald-600" />
              NGO Match Candidates & Requests ({matches?.length || 0})
            </h2>
            <p className="text-xs text-gray-500">
              Evaluated using geospatial proximity, capacity compatibility, and verified reliability.
            </p>
          </div>
        </div>

        {!matches || matches.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No NGO matches currently assigned to this batch.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {matches.map((m: any) => {
              const distance = m.score_breakdown?.distanceKm
              return (
                <li key={m.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-900">{m.ngo?.name}</span>
                      {m.ngo?.verification_status === 'VERIFIED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Verified NGO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Location: {m.ngo?.city}, {m.ngo?.state} • {distance ? `~${distance} km away` : 'Regional Area'} • Capacity: {m.ngo?.capacity_meals || 200} meals
                    </p>
                    <div className="flex items-center space-x-3 text-[11px] text-gray-400">
                      <span>Match Quality: <strong className="text-emerald-700">{m.score}%</strong></span>
                      <span>•</span>
                      <span>Expires in: {Math.max(0, Math.round((new Date(m.expires_at).getTime() - Date.now()) / 60000))} mins</span>
                    </div>
                  </div>

                  <ProviderMatchActions
                    donationId={id}
                    matchId={m.id}
                    matchStatus={m.status}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
