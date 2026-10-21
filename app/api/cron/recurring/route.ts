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

  // Fetch all active recurring donations
  const { data: recurringDonations, error: fetchError } = await supabase
    .from('recurring_donations')
    .select('provider_id, category_id, food_name, approx_quantity, quantity_unit, approx_meals, pickup_address, pickup_location')
    .eq('is_active', true)

  if (fetchError || !recurringDonations) {
    return NextResponse.json({ error: 'Failed to fetch recurring donations' }, { status: 500 })
  }

  let generatedCount = 0

  // For this simplified example, we'll pretend the cron job runs exactly when the schedule matches, 
  // or we just generate the ones that need generation today.
  // In a real system, you'd parse schedule_cron and check if it matches the current hour/day.
  
  for (const recurring of recurringDonations) {
    // Generate new donation from template
    const now = new Date()
    const consumeBefore = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default 24 hours expiry
    
    const { data: newDonation, error: insertError } = await supabase
      .from('donations')
      .insert({
        provider_id: recurring.provider_id,
        category_id: recurring.category_id,
        food_name: recurring.food_name,
        quantity: recurring.approx_quantity,
        quantity_unit: recurring.quantity_unit,
        meals_estimate: recurring.approx_meals,
        food_type: 'PREPARED', // Default assumption or should be tracked
        prepared_at: now.toISOString(),
        consume_before: consumeBefore.toISOString(),
        pickup_address: recurring.pickup_address,
        pickup_location: recurring.pickup_location,
        status: 'AVAILABLE',
        urgency: 'MEDIUM'
      })
      .select('id')
      .single()

    if (newDonation) {
      // Trigger matching via API call to internal webhook or rely on DB triggers
      generatedCount++
    }
  }

  return NextResponse.json({ 
    success: true, 
    generatedCount 
  })
}
