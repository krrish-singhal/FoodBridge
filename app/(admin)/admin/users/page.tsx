import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Users, Shield, Clock, Search } from 'lucide-react'
import { format } from 'date-fns'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export default async function AdminUsersPage(
  props: {
    searchParams?: Promise<{
      query?: string
      role?: string
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
  const roleFilter = searchParams?.role || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 10

  let dbQuery = adminClient
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      phone,
      role,
      created_at
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    
  if (query) {
    dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
  }
  
  if (roleFilter) {
    dbQuery = dbQuery.eq('role', roleFilter as any)
  }
  
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const { data: profiles, error, count } = await dbQuery.range(from, to)
  const totalItems = count || 0
  const pageCount = Math.ceil(totalItems / pageSize)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">View registered platform users and their roles.</p>
        </div>
      </div>
      
      <div className="bg-white p-4 shadow sm:rounded-lg flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form className="flex-1 w-full sm:max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            name="query" 
            defaultValue={query} 
            placeholder="Search users..." 
            className="pl-9 w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          />
          {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
        </form>
        <div className="flex gap-2 w-full sm:w-auto">
          <form className="flex items-center gap-2">
            {query && <input type="hidden" name="query" value={query} />}
            <AutoSubmitSelect
              name="role"
              defaultValue={roleFilter}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="PROVIDER">Provider</option>
              <option value="NGO">NGO</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-red-500">Failed to load users.</div>
        ) : !profiles || profiles.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No users found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile: any) => (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{profile.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{profile.email}</div>
                      {profile.phone && <div className="text-sm text-gray-500">{profile.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="mr-1.5 h-4 w-4 text-gray-400" />
                        {format(new Date(profile.created_at), 'MMM d, yyyy')}
                      </div>
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
