import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function NgoMessagesPage() {
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Coordinate directly with food providers.</p>
      </div>

      <ChatInterface organizationId={memberData.organization_id} userId={user.id} />
    </div>
  )
}
