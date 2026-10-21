import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Package, Search } from 'lucide-react'
import { format } from 'date-fns'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { DataTablePagination } from '@/components/DataTablePagination'

export default async function ProviderDonationsPage(
  props: {
    searchParams?: Promise<{
      query?: string
      status?: string
      page?: string
    }>
  }
) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const status = searchParams?.status || ''
  const page = Number(searchParams?.page) || 1
  const pageSize = 10
  const supabase = await createClient()

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get the provider organization id
  const adminClient = createAdminClient()
  const { data: memberData } = await adminClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!memberData) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Donations History</h1>
        <div className="bg-white shadow sm:rounded-lg p-6 text-center text-gray-500">
          <p>Please complete your organization registration to manage donations.</p>
        </div>
      </div>
    )
  }

  let dbQuery = adminClient
    .from('donations')
    .select(`
      id,
      food_name,
      quantity,
      quantity_unit,
      meals_estimate,
      status,
      urgency,
      created_at,
      consume_before,
      category:donation_categories(name)
    `, { count: 'exact' })
    .eq('provider_id', memberData.organization_id)
    .order('created_at', { ascending: false })
    
  if (query) {
    dbQuery = dbQuery.ilike('food_name', `%${query}%`)
  }
  
  if (status) {
    dbQuery = dbQuery.eq('status', status as any)
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
          <h1 className="text-2xl font-semibold text-gray-900">Donations History</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your food donations.</p>
        </div>
        <Link
          href="/provider/donations/new"
          className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Donation
        </Link>
      </div>

      <div className="bg-white p-4 shadow sm:rounded-lg flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form className="flex-1 w-full sm:max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            name="query" 
            defaultValue={query} 
            placeholder="Search donations..." 
            className="pl-9 w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        <div className="flex gap-2 w-full sm:w-auto">
          <form className="flex items-center gap-2">
            {query && <input type="hidden" name="query" value={query} />}
            <AutoSubmitSelect
              name="status"
              defaultValue={status}
              className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="MATCHED">Matched</option>
              <option value="PICKUP_SCHEDULED">Pickup Scheduled</option>
              <option value="DELIVERED">Delivered</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </AutoSubmitSelect>
          </form>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-red-500">Failed to load donations.</div>
        ) : !donations || donations.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No donations</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new food donation.</p>
            <div className="mt-6">
              <Link
                href="/provider/donations/new"
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
              >
                <PlusCircle className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                New Donation
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Food Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Quantity
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {donations.map((donation: any) => (
                  <tr key={donation.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      <div className="font-semibold">{donation.food_name}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {/* @ts-ignore */}
                      {donation.category?.name || 'Unknown'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {donation.quantity} {donation.quantity_unit} ({donation.meals_estimate} meals)
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        donation.status === 'AVAILABLE' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                        donation.status === 'MATCHED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                        donation.status === 'DELIVERED' || donation.status === 'DISTRIBUTED' ? 'bg-gray-50 text-gray-700 ring-gray-600/20' :
                        'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                      }`}>
                        {donation.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {format(new Date(donation.created_at), 'PPp')}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <Link href={`/provider/donations/${donation.id}`} className="text-green-600 hover:text-green-900">
                        View<span className="sr-only">, {donation.food_name}</span>
                      </Link>
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
