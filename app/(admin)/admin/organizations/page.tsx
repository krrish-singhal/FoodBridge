import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Building2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export default async function AdminOrganizationsPage(
  props: {
    searchParams?: Promise<{
      query?: string
      type?: string
      status?: string
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
  const typeFilter = searchParams?.type || ''
  const statusFilter = searchParams?.status || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 10

  // Fetch all organizations
  let dbQuery = adminClient
    .from('organizations')
    .select(`
      id,
      public_id,
      name,
      type,
      city,
      country,
      verification_status,
      created_at
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    
  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`)
  }
  
  if (typeFilter) {
    dbQuery = dbQuery.eq('type', typeFilter as any)
  }
  
  if (statusFilter) {
    dbQuery = dbQuery.eq('verification_status', statusFilter as any)
  }
  
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const { data: organizations, error, count } = await dbQuery.range(from, to)
  const totalItems = count || 0
  const pageCount = Math.ceil(totalItems / pageSize)
    
  if (error) {
    console.error('Error fetching organizations:', error)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage registered providers and NGOs.</p>
        </div>
      </div>

      <div className="bg-white p-4 shadow sm:rounded-lg flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form className="flex-1 w-full sm:max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            name="query" 
            defaultValue={query} 
            placeholder="Search organizations..." 
            className="pl-9 w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          />
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        </form>
        <div className="flex gap-2 w-full sm:w-auto">
          <form className="flex items-center gap-2">
            {query && <input type="hidden" name="query" value={query} />}
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <AutoSubmitSelect
              name="type"
              defaultValue={typeFilter}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="RESTAURANT">Restaurant</option>
              <option value="HOTEL">Hotel</option>
              <option value="EVENT_ORGANIZER">Event Organizer</option>
              <option value="CATERER">Caterer</option>
              <option value="NGO">NGO</option>
            </AutoSubmitSelect>
          </form>
          <form className="flex items-center gap-2">
            {query && <input type="hidden" name="query" value={query} />}
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            <AutoSubmitSelect
              name="status"
              defaultValue={statusFilter}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-red-500">Failed to load organizations.</div>
        ) : !organizations || organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No organizations found</h3>
            <p className="mt-1 text-sm text-gray-500">There are no organizations registered on the platform yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Location
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      <div className="font-semibold">{org.name}</div>
                      {org.public_id && <div className="text-xs text-gray-500 font-mono mt-0.5">{org.public_id}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {org.type}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {org.city}, {org.country}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        org.verification_status === 'VERIFIED' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        org.verification_status === 'REJECTED' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                        'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                      }`}>
                        {org.verification_status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {format(new Date(org.created_at), 'PP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="border-t border-gray-200 px-4 py-2">
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
