import { createClient } from '@supabase/supabase-js'
import pkg from '@next/env'
const { loadEnvConfig } = pkg

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key. Make sure .env is configured properly.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const USERS = [
  {
    email: 'admin@foodbridge.com',
    password: 'password123',
    role: 'ADMIN',
    fullName: 'System Admin',
  },
  {
    email: 'csr@foodbridge.com',
    password: 'password123',
    role: 'CSR',
    fullName: 'Corporate Social Responsibility',
  },
  {
    email: 'provider@foodbridge.com',
    password: 'password123',
    role: 'PROVIDER',
    fullName: 'Test Restaurant Provider',
  },
  {
    email: 'ngo@foodbridge.com',
    password: 'password123',
    role: 'NGO',
    fullName: 'Test NGO',
  }
]

async function seedUsers() {
  console.log('Seeding users...')
  for (const user of USERS) {
    console.log(`Creating ${user.email} (${user.role})...`)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      app_metadata: { role: user.role },
      user_metadata: {
        role: user.role,
        full_name: user.fullName
      }
    })

    let userId = authData.user?.id
    if (authError) {
      if (authError.code !== 'email_exists' && !authError.message.includes('already registered')) throw authError
      // Existing authentication records may be left behind by failed setup.
      for (let page = 1; !userId; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
        if (error) throw error
        userId = data.users.find(existing => existing.email === user.email)?.id
        if (data.users.length < 100) break
      }
    }
    if (!userId) throw new Error(`Cannot find authentication account for ${user.email}`)

    // Create the profile
    const { error: profileError } = await supabase.from('profiles').upsert([
      {
        id: userId,
        email: user.email,
        full_name: user.fullName,
        role: user.role
      }
    ])

    if (profileError) {
      throw profileError
    }

    // Create a mock organization for PROVIDER and NGO and assign membership
    if (user.role === 'PROVIDER' || user.role === 'NGO') {
      const { data: membership, error: membershipError } = await supabase.from('organization_members').select('id').eq('user_id', userId).limit(1)
      if (membershipError) throw membershipError
      if (membership?.length) continue
      const type = user.role === 'PROVIDER' ? 'RESTAURANT' : 'NGO'
      const { data: orgData, error: orgError } = await supabase.from('organizations').insert([
        {
          name: user.fullName,
          type: type,
          address: '123 Test St',
          city: 'Test City',
          country: 'Test Country',
          location: 'POINT(0 0)',
          contact_person: user.fullName,
          phone: '1234567890',
          email: user.email,
          verification_status: 'VERIFIED'
        }
      ]).select('id').single()

      if (orgError) {
        throw orgError
      } else if (orgData) {
        const { error: memberError } = await supabase.from('organization_members').insert([
          {
            organization_id: orgData.id,
            user_id: userId,
            role: 'ADMIN' // Admin within the organization
          }
        ])

        if (memberError) {
          throw memberError
        }
      }
    }
  }

  console.log('Done seeding users.')
}

seedUsers().catch(error => {
  console.error('Seeding failed:', error)
  process.exitCode = 1
})
