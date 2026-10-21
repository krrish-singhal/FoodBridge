import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { 
  Activity, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle,
  ArrowRight, 
  Search, 
  CheckCircle2, 
  UserPlus, 
  Building2, 
  Package, 
  Sparkles, 
  Truck, 
  User, 
  Cpu
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

function formatMetadataBadge(key: string, value: any): { displayKey: string; displayVal: string } {
  const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value)
  const lowerKey = key.toLowerCase()

  if (lowerKey === 'verificationid' || lowerKey === 'verification_id') {
    // Short, friendly verification ID format usable between users and staff
    const cleanId = strVal.replace(/[^a-zA-Z0-9]/g, '')
    const shortRef = cleanId.substring(0, 8).toUpperCase()
    return {
      displayKey: 'Verification Ref',
      displayVal: `VRF-${shortRef}`,
    }
  }

  // General UUID format: short 8-char reference code
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(strVal)) {
    const shortId = strVal.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase()
    const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    return {
      displayKey: readableKey.charAt(0).toUpperCase() + readableKey.slice(1),
      displayVal: `#${shortId}`,
    }
  }

  const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
  return {
    displayKey: readableKey.charAt(0).toUpperCase() + readableKey.slice(1),
    displayVal: strVal,
  }
}

interface EventVisuals {
  title: string
  narrative: string
  icon: typeof Activity
  iconColor: string
  iconBg: string
  badgeText: string
  badgeStyle: string
}

function getEventVisuals(
  log: any,
  actorName: string,
  actorRole: string,
  targetOrg?: { name: string; type: string } | null,
  targetUser?: { full_name: string; role: string } | null,
  targetDonation?: { food_name: string } | null
): EventVisuals {
  const note = log.metadata?.note
  const severity = log.metadata?.severity

  switch (log.action) {
    case 'USER_REGISTERED': {
      const role = targetUser?.role || actorRole || 'User'
      const name = targetUser?.full_name || actorName
      return {
        title: 'New User Registered',
        narrative: note || `${name} joined FoodBridge as a ${role.toLowerCase()}.`,
        icon: UserPlus,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50 border-emerald-200',
        badgeText: role,
        badgeStyle: role === 'NGO' 
          ? 'bg-amber-50 text-amber-700 border-amber-200/80' 
          : role === 'PROVIDER' 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
          : 'bg-blue-50 text-blue-700 border-blue-200/80',
      }
    }

    case 'ORG_VERIFIED':
    case 'VERIFICATION_VERIFIED': {
      const orgLabel = targetOrg ? `"${targetOrg.name}" (${targetOrg.type})` : 'organization credentials'
      return {
        title: 'Organization Verified',
        narrative: `${actorName} reviewed and approved ${orgLabel}.`,
        icon: ShieldCheck,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50 border-emerald-200',
        badgeText: 'Verified & Active',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      }
    }

    case 'VERIFICATION_REJECTED': {
      const orgLabel = targetOrg ? `"${targetOrg.name}"` : 'organization'
      return {
        title: 'Verification Declined',
        narrative: `${actorName} declined registration for ${orgLabel}.`,
        icon: ShieldAlert,
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50 border-rose-200',
        badgeText: 'Declined',
        badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200/80',
      }
    }

    case 'DONATION_CREATED': {
      const food = targetDonation?.food_name || 'surplus food items'
      return {
        title: 'Food Donation Listed',
        narrative: `${actorName} listed a new donation: "${food}".`,
        icon: Package,
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-50 border-teal-200',
        badgeText: 'Available',
        badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200/80',
      }
    }

    case 'DONATION_UPDATED': {
      const food = targetDonation?.food_name || 'food donation'
      return {
        title: 'Donation Updated',
        narrative: `${actorName} modified donation details for "${food}".`,
        icon: Package,
        iconColor: 'text-sky-600',
        iconBg: 'bg-sky-50 border-sky-200',
        badgeText: 'Modified',
        badgeStyle: 'bg-sky-50 text-sky-700 border-sky-200/80',
      }
    }

    case 'MATCH_CREATED': {
      return {
        title: 'Automated Match Found',
        narrative: 'Platform algorithm matched available surplus food with a nearby NGO.',
        icon: Sparkles,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-50 border-purple-200',
        badgeText: 'Matched',
        badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200/80',
      }
    }

    case 'MATCH_FAILED': {
      return {
        title: 'Automated Match Failed',
        narrative: note || 'Automated dispatcher could not find an available recipient NGO.',
        icon: AlertTriangle,
        iconColor: 'text-rose-600',
        iconBg: 'bg-rose-50 border-rose-200',
        badgeText: 'Match Failed',
        badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200/80',
      }
    }

    case 'MATCH_ACCEPTED': {
      return {
        title: 'Match Accepted by NGO',
        narrative: `${actorName} confirmed and accepted matched food donation.`,
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50 border-emerald-200',
        badgeText: 'Accepted',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      }
    }

    case 'PICKUP_SCHEDULED': {
      return {
        title: 'Pickup Scheduled',
        narrative: 'Food pickup and transport coordinated with delivery agent.',
        icon: Truck,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50 border-blue-200',
        badgeText: 'Scheduled',
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200/80',
      }
    }

    case 'PICKUP_COMPLETED': {
      return {
        title: 'Food Donation Delivered',
        narrative: 'Food handover verified with secure OTP and marked delivered.',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50 border-emerald-200',
        badgeText: 'Completed',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      }
    }

    default: {
      const humanTitle = log.action
        .toLowerCase()
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

      const isError = severity === 'ERROR' || severity === 'CRITICAL'
      const isWarn = severity === 'WARNING'

      return {
        title: humanTitle,
        narrative: note || `${actorName} recorded activity on ${log.entity_type?.toLowerCase() || 'system'}.`,
        icon: isError ? ShieldAlert : isWarn ? AlertTriangle : Activity,
        iconColor: isError ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-gray-600',
        iconBg: isError ? 'bg-rose-50 border-rose-200' : isWarn ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200',
        badgeText: humanTitle,
        badgeStyle: isError 
          ? 'bg-rose-50 text-rose-700 border-rose-200/80' 
          : isWarn 
          ? 'bg-amber-50 text-amber-700 border-amber-200/80' 
          : 'bg-gray-50 text-gray-700 border-gray-200/80',
      }
    }
  }
}

export default async function AdminActivityPage(
  props: {
    searchParams?: Promise<{
      query?: string
      severity?: string
      page?: string
    }>
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || user.user_metadata?.role !== 'ADMIN') {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const severityFilter = searchParams?.severity || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 15

  // Fetch recent audit logs with joined actor profile
  let dbQuery = adminClient
    .from('audit_logs')
    .select(`
      id,
      action,
      actor_id,
      entity_type,
      entity_id,
      metadata,
      created_at,
      actor:profiles(id, full_name, role, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    
  if (query) {
    dbQuery = dbQuery.or(`action.ilike.%${query}%,metadata->>note.ilike.%${query}%`)
  }
  
  if (severityFilter) {
    dbQuery = dbQuery.eq('metadata->>severity', severityFilter)
  }
  
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const { data: logs, error, count } = await dbQuery.range(from, to)
  const totalItems = count || 0
  const pageCount = Math.ceil(totalItems / pageSize)

  // Batch resolve entity targets for human readability
  const logList: any[] = logs || []
  const orgIds = logList.filter((l: any) => l.entity_type === 'ORGANIZATION' && l.entity_id).map((l: any) => l.entity_id)
  const userIds = logList.filter((l: any) => l.entity_type === 'USER' && l.entity_id).map((l: any) => l.entity_id)
  const donationIds = logList.filter((l: any) => l.entity_type === 'DONATION' && l.entity_id).map((l: any) => l.entity_id)

  const [orgsRes, usersRes, donationsRes] = await Promise.all([
    orgIds.length ? adminClient.from('organizations').select('id, name, type').in('id', orgIds) : { data: [] },
    userIds.length ? adminClient.from('profiles').select('id, full_name, role, email').in('id', userIds) : { data: [] },
    donationIds.length ? adminClient.from('donations').select('id, food_name').in('id', donationIds) : { data: [] }
  ])

  const orgMap = new Map<string, any>((orgsRes.data || []).map((o: any) => [o.id, o]))
  const userMap = new Map<string, any>((usersRes.data || []).map((u: any) => [u.id, u]))
  const donationMap = new Map<string, any>((donationsRes.data || []).map((d: any) => [d.id, d]))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">System Activity</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time, human-readable audit trail of administrative actions, user events, and operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Event Stream
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 shadow-sm border border-gray-200/80 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form className="flex-1 w-full sm:max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            name="query" 
            defaultValue={query} 
            placeholder="Search by event, actor, or description..." 
            className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 sm:text-sm py-2"
          />
          {severityFilter && <input type="hidden" name="severity" value={severityFilter} />}
        </form>
        <div className="flex gap-2 w-full sm:w-auto">
          <form className="flex items-center gap-2 w-full sm:w-auto">
            {query && <input type="hidden" name="query" value={query} />}
            <AutoSubmitSelect
              name="severity"
              defaultValue={severityFilter}
              className="w-full sm:w-auto rounded-lg border-gray-300 shadow-sm focus:border-green-600 focus:ring-green-600 sm:text-sm py-2 px-3 bg-white"
            >
              <option value="">All Severities</option>
              <option value="INFO">Info (Normal)</option>
              <option value="WARNING">Warnings</option>
              <option value="ERROR">Errors</option>
              <option value="CRITICAL">Critical</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white shadow-sm border border-gray-200/80 rounded-xl overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-500 text-sm">Failed to load activity logs.</div>
        ) : !logs || logs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No activity logged</h3>
            <p className="mt-1 text-sm text-gray-500">Events and administrative actions will appear here as they occur.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <ul className="divide-y divide-gray-100">
              {logs.map((log: any) => {
                const actorName = log.actor?.full_name || (log.actor_id ? 'Authenticated User' : 'FoodBridge System')
                const actorRole = log.actor?.role || (log.actor_id ? 'USER' : 'SYSTEM')
                
                const targetOrg = log.entity_type === 'ORGANIZATION' ? orgMap.get(log.entity_id) : null
                const targetUser = log.entity_type === 'USER' ? userMap.get(log.entity_id) : null
                const targetDonation = log.entity_type === 'DONATION' ? donationMap.get(log.entity_id) : null

                const visuals = getEventVisuals(log, actorName, actorRole, targetOrg, targetUser, targetDonation)
                const IconComponent = visuals.icon
                const logDate = new Date(log.created_at)

                // Clean extra metadata tags (excluding internal keys already shown in UI)
                const metadataEntries = Object.entries(log.metadata || {}).filter(
                  ([key]) => !['note', 'severity'].includes(key)
                )

                return (
                  <li key={log.id} className="p-5 sm:px-6 hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Icon & Core Details */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Event Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${visuals.iconBg}`}>
                          <IconComponent className={`h-5 w-5 ${visuals.iconColor}`} />
                        </div>

                        {/* Event Text & Context */}
                        <div className="flex-1 min-w-0">
                          {/* Title + Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {visuals.title}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${visuals.badgeStyle}`}>
                              {visuals.badgeText}
                            </span>
                            {log.metadata?.severity && log.metadata?.severity !== 'INFO' && (
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                                log.metadata.severity === 'CRITICAL' || log.metadata.severity === 'ERROR'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {log.metadata.severity}
                              </span>
                            )}
                          </div>

                          {/* Readable Narrative */}
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                            {visuals.narrative}
                          </p>

                          {/* Actor & Target Context Chips */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-2.5">
                            {/* Actor Pill */}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100/80 text-gray-700 font-medium">
                              {actorRole === 'SYSTEM' ? (
                                <Cpu className="h-3.5 w-3.5 text-purple-600" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-gray-500" />
                              )}
                              <span>{actorName}</span>
                              {actorRole !== 'SYSTEM' && (
                                <span className="text-[10px] text-gray-400 font-normal uppercase tracking-wider">
                                  ({actorRole})
                                </span>
                              )}
                            </span>

                            {/* Arrow to target if applicable and different from actor */}
                            {Boolean(
                              targetOrg || 
                              (targetUser && targetUser.id !== log.actor_id) || 
                              targetDonation || 
                              (log.entity_type !== 'SYSTEM' && log.entity_id && log.entity_id !== log.actor_id)
                            ) && (
                              <>
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100/80 text-gray-700 font-medium">
                                  {log.entity_type === 'ORGANIZATION' ? (
                                    <Building2 className="h-3.5 w-3.5 text-amber-600" />
                                  ) : log.entity_type === 'USER' ? (
                                    <User className="h-3.5 w-3.5 text-blue-600" />
                                  ) : log.entity_type === 'DONATION' ? (
                                    <Package className="h-3.5 w-3.5 text-teal-600" />
                                  ) : (
                                    <Activity className="h-3.5 w-3.5 text-gray-500" />
                                  )}
                                  <span>
                                    {targetOrg
                                      ? `${targetOrg.name} (${targetOrg.type})`
                                      : targetUser
                                      ? `${targetUser.full_name} (${targetUser.role})`
                                      : targetDonation
                                      ? targetDonation.food_name
                                      : `${log.entity_type} [${log.entity_id?.substring(0, 8)}...]`}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Clean Metadata Tag Chips */}
                          {metadataEntries.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                              {metadataEntries.map(([key, val]) => {
                                const { displayKey, displayVal } = formatMetadataBadge(key, val)
                                return (
                                  <span 
                                    key={key} 
                                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-50/70 border border-emerald-200/70 text-emerald-950 font-medium"
                                  >
                                    <span className="text-gray-500 font-normal">{displayKey}:</span>
                                    <span className="font-mono text-emerald-800 font-semibold tracking-wide">{displayVal}</span>
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Timestamp */}
                      <div className="flex-shrink-0 flex flex-col items-end text-xs text-gray-500 pt-0.5">
                        <span className="font-medium text-gray-700">
                          {format(logDate, 'MMM d, yyyy')}
                        </span>
                        <span className="text-gray-400 mt-0.5">
                          {format(logDate, 'h:mm a')}
                        </span>
                        <span className="text-[11px] text-gray-400 mt-1">
                          {formatDistanceToNow(logDate, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Pagination */}
            <div className="border-t border-gray-200/80 px-4 py-3 bg-gray-50/50">
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

