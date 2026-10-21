import { createClient } from '@supabase/supabase-js'
import * as nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

async function clearOldData() {
  console.log('Clearing old data...')
  await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('conversation_members').delete().neq('conversation_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('pickup_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('pickup_proof').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('pickup_otp').delete().neq('pickup_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('pickups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('match_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('donation_safety_checklists').delete().neq('donation_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('donation_allergens').delete().neq('donation_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('donation_images').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('donations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('organization_preferences').delete().neq('organization_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('organization_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('Deleting auth users (this might take a moment)...')
  let hasMore = true
  let page = 1
  while (hasMore) {
    const { data: usersData, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !usersData?.users?.length) {
      hasMore = false
      break
    }
    for (const u of usersData.users) {
      await supabase.auth.admin.deleteUser(u.id)
    }
    if (usersData.users.length < 1000) hasMore = false
    page++
  }

  console.log('Database wiped cleanly!')
}

clearOldData().catch(console.error)
