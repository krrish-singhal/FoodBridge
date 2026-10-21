import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, CheckCircle, XCircle, Clock } from 'lucide-react'
import { VerificationActions } from './VerificationActions'

export default async function AdminVerificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'ADMIN') {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  // Fetch pending and under review verifications
  const { data: verifications, error } = await adminClient
    .from('organization_verification')
    .select(`
      id,
      status,
      created_at,
      organization:organizations(id, name, type, email, phone, city, country)
    `)
    .in('status', ['PENDING', 'UNDER_REVIEW'])
    .order('created_at', { ascending: true }) as any

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pending Verifications</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve new organization registrations.</p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-red-500">Failed to load verifications.</div>
        ) : !verifications || verifications.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">All caught up</h3>
            <p className="mt-1 text-sm text-gray-500">There are no pending organization verifications.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {verifications.map((v: any) => (
              <li key={v.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {/* @ts-ignore */}
                        {v.organization?.name}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${v.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:space-x-6">
                      <div className="flex items-center text-sm text-gray-500">
                        {/* @ts-ignore */}
                        <span className="font-semibold mr-1">Type:</span> {v.organization?.type}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1 sm:mt-0">
                        {/* @ts-ignore */}
                        <span className="font-semibold mr-1">Location:</span> {v.organization?.city}, {v.organization?.country}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1 sm:mt-0">
                        {/* @ts-ignore */}
                        <span className="font-semibold mr-1">Contact:</span> {v.organization?.email}
                      </div>
                    </div>
                  </div>
                  
                  {/* @ts-ignore */}
                  <VerificationActions verificationId={v.id} organizationId={v.organization?.id} />
                  
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
