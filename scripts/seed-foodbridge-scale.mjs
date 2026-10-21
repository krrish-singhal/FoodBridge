import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key. Make sure .env is configured properly.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Generate some basic data
const generateUsers = async () => {
  console.log('Generating users and organizations...')
  
  const providers = []
  const ngos = []
  
  // Base point somewhere in a city, e.g., NYC 40.7128, -74.0060
  const latBase = 40.7128
  const lngBase = -74.0060
  
  const types = ['RESTAURANT', 'HOTEL', 'EVENT_ORGANIZER', 'CATERER']
  
  // Batch processing
  for (let b = 0; b < 5; b++) {
    const orgs = []
    const profiles = []
    const members = []
    
    for (let i = 0; i < 100; i++) {
      const idx = (b * 100) + i
      const isProvider = idx < 250 // 250 Providers, 250 NGOs
      const role = isProvider ? 'PROVIDER' : 'NGO'
      const orgType = isProvider ? types[idx % types.length] : 'NGO'
      const name = isProvider ? `Synthetic Provider ${idx}` : `Synthetic NGO ${idx}`
      
      const email = `testuser${idx}@foodbridge.test`
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        app_metadata: { role },
        user_metadata: {
          role,
          full_name: name
        }
      })
      
      let userId = authData?.user?.id
      if (authError) {
        if (authError.message.includes('already registered') || authError.code === 'email_exists' || authError.status === 422) {
          // fetch from profiles
          const { data: existingProfile } = await supabase.from('profiles').select('id, role').eq('email', email).single()
          if (existingProfile) {
            userId = existingProfile.id
          } else {
            continue
          }
        } else if (authError.message.includes('rate limit') || authError.message.includes('fetch failed')) {
          console.log('Rate limited or fetch failed, waiting 5 seconds...')
          await sleep(5000)
          continue
        } else {
          console.error(authError)
          continue
        }
      }
      
      await sleep(100) // Small delay to avoid rate limit
      
      if (!userId) continue
      
      profiles.push({
        id: userId,
        email,
        full_name: name,
        role,
      })
      
      const lat = latBase + (Math.random() - 0.5) * 0.2
      const lng = lngBase + (Math.random() - 0.5) * 0.2
      
      const { data: orgData, error: orgError } = await supabase.from('organizations').insert({
        name: name,
        type: orgType,
        address: `${1000 + idx} Synthetic St`,
        city: 'Metropolis',
        country: 'US',
        location: `POINT(${lng} ${lat})`,
        contact_person: name,
        phone: '1234567890',
        email: email,
        verification_status: 'VERIFIED'
      }).select('id').single()
      
      if (!orgError && orgData) {
        members.push({
          organization_id: orgData.id,
          user_id: userId,
          role: 'ADMIN'
        })
        
        if (isProvider) {
          providers.push(orgData.id)
        } else {
          ngos.push(orgData.id)
        }
      }
    }
    
    if (profiles.length > 0) await supabase.from('profiles').upsert(profiles)
    if (members.length > 0) await supabase.from('organization_members').insert(members)
  }
  
  return { providers, ngos }
}

async function seed() {
  if (process.argv.includes('--reset')) {
    await clearOldData()
  }
  
  // ensure we have default category
  await supabase.from('donation_categories').upsert({ id: '00000000-0000-0000-0000-000000000001', name: 'Cooked Meals' })
  
  const { providers, ngos } = await generateUsers()
  
  console.log(`Generated ${providers.length} providers and ${ngos.length} NGOs.`)
  console.log('Generating donations and matches...')
  
  for (let b = 0; b < 10; b++) {
    const donations = []
    for (let i = 0; i < 50; i++) { // 500 donations total
      const providerId = providers[Math.floor(Math.random() * providers.length)]
      if (!providerId) continue
      
      const lat = 40.7128 + (Math.random() - 0.5) * 0.2
      const lng = -74.0060 + (Math.random() - 0.5) * 0.2
      
      donations.push({
        provider_id: providerId,
        category_id: '00000000-0000-0000-0000-000000000001',
        food_name: 'Synthetic Meal Batch',
        quantity: Math.floor(Math.random() * 50) + 10,
        quantity_unit: 'portions',
        meals_estimate: Math.floor(Math.random() * 50) + 10,
        food_type: 'Veg',
        prepared_at: new Date().toISOString(),
        consume_before: new Date(Date.now() + 86400000).toISOString(),
        pickup_location: `POINT(${lng} ${lat})`,
        pickup_address: '123 Fake St',
        status: 'AVAILABLE'
      })
    }
    
    if (donations.length > 0) {
      const { data: insertedDonations } = await supabase.from('donations').insert(donations).select('id')
      
      if (insertedDonations) {
        const matches = []
        for (const donation of insertedDonations.slice(0, 20)) { // 200 matches total
          const ngoId = ngos[Math.floor(Math.random() * ngos.length)]
          if (!ngoId) continue
          
          matches.push({
            donation_id: donation.id,
            ngo_id: ngoId,
            status: 'PENDING',
            score: Math.floor(Math.random() * 50) + 50,
            expires_at: new Date(Date.now() + 3600000).toISOString()
          })
          
          await supabase.from('donations').update({ status: 'MATCHED' }).eq('id', donation.id)
        }
        
        if (matches.length > 0) {
          await supabase.from('matches').insert(matches)
        }
      }
    }
  }
  
  console.log('Seeding complete.')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
