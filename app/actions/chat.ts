'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, getUserOrganizations } from '@/lib/auth/getUser'

export async function fetchConversations(organizationId: string) {
  const auth = await getCurrentUser()
  if (!auth) throw new Error('UNAUTHORIZED')
  const orgs = await getUserOrganizations(auth.user.id)
  if (!orgs.some(o => o.id === organizationId)) throw new Error('FORBIDDEN')

  const adminClient = createAdminClient()
  
  const { data: memberRows } = await adminClient
    .from('conversation_members')
    .select('conversation_id')
    .eq('organization_id', organizationId) as any

  if (!memberRows || memberRows.length === 0) {
    return []
  }

  const convIds = memberRows.map((m: any) => m.conversation_id)

  const { data: convData } = await adminClient
    .from('conversations')
    .select(`
      id, match_id, created_at,
      match:matches(donation:donations(food_name)),
      members:conversation_members(organization:organizations(id, name, type))
    `)
    .in('id', convIds)
    .order('updated_at', { ascending: false }) as any

  if (convData) {
    return convData.map((c: any) => {
      const otherOrg = c.members.find((m: any) => m.organization.id !== organizationId)?.organization
      return {
        id: c.id,
        match_id: c.match_id,
        created_at: c.created_at,
        food_name: c.match.donation?.food_name || 'Donation',
        other_org: otherOrg
      }
    })
  }
  return []
}

export async function fetchMessages(convId: string) {
  const auth = await getCurrentUser()
  if (!auth) throw new Error('UNAUTHORIZED')

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('messages')
    .select('id, content, created_at, sender_org_id')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    
  return data || []
}

export async function sendMessage(activeConvId: string, organizationId: string, userId: string, content: string) {
  const auth = await getCurrentUser()
  if (!auth || auth.user.id !== userId) throw new Error('UNAUTHORIZED')
  const orgs = await getUserOrganizations(auth.user.id)
  if (!orgs.some(o => o.id === organizationId)) throw new Error('FORBIDDEN')

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('messages').insert({
    conversation_id: activeConvId,
    sender_org_id: organizationId,
    sender_user_id: userId,
    content: content
  } as any)

  if (!error) {
    const payload = { updated_at: new Date().toISOString() }
    await (adminClient.from('conversations') as any).update(payload).eq('id', activeConvId)
  } else {
    throw new Error(error.message)
  }
}
