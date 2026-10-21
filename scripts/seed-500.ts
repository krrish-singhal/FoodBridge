import { createClient } from '@supabase/supabase-js'
import * as nextEnv from '@next/env'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import path from 'path'
import dns from 'dns'

// Node 18+ requires programmatic DNS order fix (--dns-result-order flag no longer works)
dns.setDefaultResultOrder('ipv4first')

nextEnv.loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Helper for concurrency
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function asyncBatch(items: any[], limit: number, fn: (item: any) => Promise<any>) {
  const results = []
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit)
    const chunkResults = await Promise.all(chunk.map(fn))
    results.push(...chunkResults)
    await sleep(250) // add slight delay between batches to avoid connection drop
  }
  return results
}

async function run() {
  console.log('Loading CSV...')
  const csvPath = path.join(process.cwd(), 'foodbridge_500_india_users.csv')
  const fileContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parse(fileContent, { columns: true, skip_empty_lines: true })
  console.log(`Loaded ${records.length} records.`)

  // Pre-fetch existing profiles and orgs to be idempotent
  console.log('Fetching existing data for idempotency check...')
  const { data: existingProfiles } = await supabase.from('profiles').select('id, email')
  const { data: existingOrgs } = await supabase.from('organizations').select('id, public_id')

  const profileEmailMap = new Map(existingProfiles?.map((p: any) => [p.email, p.id]))
  const orgPublicIdMap = new Map(existingOrgs?.map((o: any) => [o.public_id, o.id]))

  const processedUsers: {userId: string, row: any}[] = []
  const organizationsToInsert = new Map()

  console.log('Processing users...')
  
  await asyncBatch(records, 1, async (rawRow: any) => {
    // Convert .test to .com so the user can login as requested
    // And normalize ORGANISATION role to NGO
    const normalizedRole = rawRow.role === 'ORGANISATION' ? 'NGO' : rawRow.role
    const row = { ...rawRow, email: rawRow.email.replace('.test', '.com'), role: normalizedRole }
    
    let userId = profileEmailMap.get(row.email)
    if (userId) {
      console.log(`User ${row.email} exists in DB, updating metadata and profile.`)
      // Ensure the role is corrected in auth.users if it was previously set to ORGANISATION
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: row.role, full_name: row.full_name },
        app_metadata: { role: row.role }
      })
    } else {
      let retryCount = 0
      while (retryCount < 5 && !userId) {
        // Create user
        const { data, error } = await supabase.auth.admin.createUser({
          email: row.email,
          password: 'password123',
          email_confirm: true,
          user_metadata: { role: row.role, full_name: row.full_name },
          app_metadata: { role: row.role }
        })
        if (error) {
          if (error.code === 'email_exists' || error.message?.includes('already registered')) {
            break // fallback logic if needed
          } else if (error.message?.includes('fetch failed') || error.message?.includes('rate limit')) {
            retryCount++
            console.log(`Retry ${retryCount}/5 for ${row.email} (Error: ${error.message})`)
            await sleep(2000 * retryCount) // exponential backoff
          } else {
            console.error(`Error creating user ${row.email}:`, error.message)
            break
          }
        } else {
          userId = data.user.id
          console.log(`✅ Created user ${row.email}`)
        }
      }
    }

    if (userId) {
      processedUsers.push({ userId, row })
      
      // Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        phone: row.phone,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      if (profileError) console.error(`Profile error for ${row.email}:`, profileError)

      // Handle organization mapping
      if (row.organization_public_id && (row.role === 'PROVIDER' || row.role === 'NGO')) {
        if (!orgPublicIdMap.has(row.organization_public_id) && !organizationsToInsert.has(row.organization_public_id)) {
          const validTypes = ['RESTAURANT', 'HOTEL', 'EVENT_ORGANIZER', 'CATERER', 'NGO', 'SUPERMARKET', 'OTHER']
          const orgType = validTypes.includes(row.organization_type) ? row.organization_type : 'OTHER'
          
          organizationsToInsert.set(row.organization_public_id, {
            public_id: row.organization_public_id,
            name: row.organization_name,
            type: orgType,
            verification_status: row.verification_status,
            city: row.city,
            state: row.state,
            country: row.country,
            address: row.address,
            phone: row.phone,
            email: row.email, // using admin user's email
            contact_person: row.full_name, // required NOT NULL field
            location: `POINT(${row.longitude} ${row.latitude})`,
            operating_radius_km: row.pickup_radius_km ? parseInt(row.pickup_radius_km) : null,
            created_at: row.registered_at ? new Date(row.registered_at).toISOString() : new Date().toISOString()
          })
        }
      }
    }
  })

  console.log('Upserting organizations...')
  const orgsArray = Array.from(organizationsToInsert.values())
  if (orgsArray.length > 0) {
    // Insert orgs in batches
    for (let i = 0; i < orgsArray.length; i += 50) {
      const { data, error } = await supabase.from('organizations')
        .upsert(orgsArray.slice(i, i + 50), { onConflict: 'public_id' })
        .select('id, public_id')
      if (error) console.error('Org insert error:', error)
      if (data) {
        for (const d of data) orgPublicIdMap.set(d.public_id, d.id)
      }
    }
  }

  console.log('Mapping users to organizations...')
  const memberInserts = []
  for (const p of processedUsers) {
    if (p.row.organization_public_id) {
      const orgId = orgPublicIdMap.get(p.row.organization_public_id)
      if (orgId) {
        memberInserts.push({
          organization_id: orgId,
          user_id: p.userId,
          role: 'ADMIN' // Default to admin for the original user
        })
      }
    }
  }
  
  if (memberInserts.length > 0) {
    for (let i = 0; i < memberInserts.length; i += 100) {
      await supabase.from('organization_members').upsert(memberInserts.slice(i, i + 100), { onConflict: 'organization_id,user_id' })
    }
  }

  console.log('Generating operational data (Donations, Matches, Pickups, Activity)...')
  const { data: catData, error: catErr } = await supabase.from('donation_categories').select('id').limit(1).single()
  if (!catData || catErr) {
    console.error("Could not find a donation category!", catErr)
    return
  }
  const defaultCategoryId = catData.id;

  // Find all providers and ngos from processed users
  const providers = processedUsers.filter(u => u.row.role === 'PROVIDER' && orgPublicIdMap.has(u.row.organization_public_id))
  const ngos = processedUsers.filter(u => u.row.role === 'NGO' && orgPublicIdMap.has(u.row.organization_public_id))

  let donationsInserted = 0
  let matchesInserted = 0
  let pickupsInserted = 0

  await asyncBatch(providers, 5, async (provider) => {
    const orgId = orgPublicIdMap.get(provider.row.organization_public_id)
    if (!orgId) return

    // Ensure idempotency for operational data by checking if this provider already has donations
    const { count } = await supabase.from('donations').select('*', { count: 'exact', head: true }).eq('provider_id', orgId)
    if (count && count > 0) return // Skip operational generation if already exists

    // Generate 2 donations per provider
    const donations = [
      {
        provider_id: orgId,
        category_id: defaultCategoryId,
        food_name: 'Surplus Event Meals',
        quantity: 50,
        quantity_unit: 'portions',
        food_type: 'Veg',
        meals_estimate: 50,
        prepared_at: new Date(new Date(provider.row.registered_at).getTime() - 3600000).toISOString(),
        consume_before: new Date(new Date(provider.row.registered_at).getTime() + 86400000).toISOString(),
        pickup_location: `POINT(${provider.row.longitude} ${provider.row.latitude})`,
        pickup_address: provider.row.address,
        status: 'AVAILABLE',
        created_at: provider.row.registered_at
      },
      {
        provider_id: orgId,
        category_id: defaultCategoryId,
        food_name: 'Daily Leftovers',
        quantity: 20,
        quantity_unit: 'kgs',
        food_type: 'Non-Veg',
        meals_estimate: 20,
        prepared_at: new Date(new Date(provider.row.last_active_at).getTime() - 7200000).toISOString(),
        consume_before: new Date(new Date(provider.row.last_active_at).getTime() + 86400000).toISOString(),
        pickup_location: `POINT(${provider.row.longitude} ${provider.row.latitude})`,
        pickup_address: provider.row.address,
        status: 'DELIVERED',
        created_at: provider.row.last_active_at
      }
    ]

    const { data: dData, error: dError } = await supabase.from('donations').insert(donations).select('id, status')
    if (dError) console.error('Donation error:', dError)
    if (dError || !dData) return
    donationsInserted += dData.length

    const availableDonation = dData.find(d => d.status === 'AVAILABLE')
    const completedDonation = dData.find(d => d.status === 'COMPLETED')

    // Find a random NGO
    const randomNgo = ngos[Math.floor(Math.random() * ngos.length)]
    if (!randomNgo) return
    const ngoOrgId = orgPublicIdMap.get(randomNgo.row.organization_public_id)

    if (completedDonation && ngoOrgId) {
      // Create a MATCH for the completed one
      const { data: mData } = await supabase.from('matches').insert({
        donation_id: completedDonation.id,
        ngo_id: ngoOrgId,
        status: 'ACCEPTED',
        score: 95
      }).select('id').single()
      
      if (mData) {
        matchesInserted++
        // Create a PICKUP
        await supabase.from('pickups').insert({
          match_id: mData.id,
          ngo_id: ngoOrgId,
          status: 'DELIVERED',
          scheduled_time: new Date().toISOString()
        })
        pickupsInserted++

        // Create an audit log
        await supabase.from('audit_logs').insert({
          action: 'PICKUP_DELIVERED',
          actor_id: randomNgo.userId,
          target_id: completedDonation.id,
          target_type: 'DONATION',
          details: { match_id: mData.id, note: 'Seeded via 500-user script' }
        })
      }
    }

    if (availableDonation && ngoOrgId) {
      // Just a pending match
      await supabase.from('matches').insert({
        donation_id: availableDonation.id,
        ngo_id: ngoOrgId,
        status: 'PENDING',
        score: 80
      })
      matchesInserted++
    }
  })

  console.log(`Operational Data Done. Inserted ${donationsInserted} donations, ${matchesInserted} matches, ${pickupsInserted} pickups.`)
  console.log('Seeding process complete! ✅')
}

run().catch(err => {
  console.error('Unhandled error in seed script:', err)
  process.exit(1)
})
