import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Simple auth check for cron (e.g. check a secret header)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'secret'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role key to bypass RLS for cron jobs
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  // 1. Mark donations as EXPIRED if consume_before is past
  const { data: expiredDonations, error: expError } = await supabase
    .from('donations')
    .select('id, provider_id')
    .lt('consume_before', now.toISOString())
    .in('status', ['AVAILABLE', 'MATCHED'])

  if (expiredDonations && expiredDonations.length > 0) {
    const expiredIds = expiredDonations.map(d => d.id)
    
    // Update donations
    await supabase
      .from('donations')
      .update({ status: 'EXPIRED' })
      .in('id', expiredIds)
      
    // Update active matches
    await supabase
      .from('matches')
      .update({ status: 'EXPIRED' })
      .in('donation_id', expiredIds)
      .in('status', ['PENDING', 'ACCEPTED', 'NOTIFIED'])
  }

  // 2. Alert for expiring soon (within 2 hours)
  const { data: expiringSoon, error: soonError } = await supabase
    .from('donations')
    .select('id, provider_id, food_name')
    .lt('consume_before', twoHoursFromNow.toISOString())
    .gt('consume_before', now.toISOString())
    .in('status', ['AVAILABLE', 'MATCHED'])

  if (expiringSoon && expiringSoon.length > 0) {
    // We should send a notification.
    // For simplicity, we just log here, but in production, we insert into `notifications` table.
    const notifications = []
    
    for (const donation of expiringSoon) {
      // Find members of provider
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', donation.provider_id)
        
      if (members) {
        for (const member of members) {
          notifications.push({
            user_id: member.user_id,
            type: 'EXPIRING_SOON',
            title: 'Donation Expiring Soon',
            body: `Your donation "${donation.food_name}" will expire in less than 2 hours.`,
            link: `/provider/donations`,
            idempotency_key: `expiry_soon_${donation.id}_${member.user_id}`
          })
        }
      }
    }
    
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications).select()
    }
  }

  return NextResponse.json({ 
    success: true, 
    expiredCount: expiredDonations?.length || 0,
    alertedCount: expiringSoon?.length || 0
  })
}
