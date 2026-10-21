import assert from 'node:assert/strict'
import nextEnv from '@next/env'
import { createServerClient } from '@supabase/ssr'

nextEnv.loadEnvConfig(process.cwd())
const base = process.env.PORTAL_TEST_URL || 'http://localhost:3001'
for (const role of ['provider', 'ngo', 'admin', 'csr']) {
  const path = `/${role}/dashboard`
  const anonymous = await fetch(`${base}${path}`, { redirect: 'manual' })
  assert.equal(new URL(anonymous.headers.get('location'), base).pathname, '/login')
  const cookies = new Map()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: values => values.forEach(({ name, value }) => cookies.set(name, value)),
    },
  })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${role}@foodbridge.com`, password: process.env.PORTAL_TEST_PASSWORD || 'password123',
  })
  assert.ifError(error)
  const profile = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
  assert.ifError(profile.error)
  assert.equal(profile.data.role, role.toUpperCase())
  const headers = { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') }
  const response = await fetch(`${base}${path}`, { headers, redirect: 'manual' })
  assert.equal(response.status, 200, `${role} dashboard status`)
  const html = await response.text()
  const heading = { provider: 'Provider Dashboard', ngo: 'NGO Dashboard', admin: 'Platform Overview', csr: 'CSR Dashboard' }[role]
  if (!html.includes(heading)) { console.error("HTML output:", html); assert.ok(false, `${role} dashboard heading`); }

  const login = await fetch(`${base}/login`, { headers, redirect: 'manual' })
  assert.equal(new URL(login.headers.get('location'), base).pathname, path)
  const other = role === 'provider' ? 'admin' : 'provider'
  const forbidden = await fetch(`${base}/${other}/dashboard`, { headers, redirect: 'manual' })
  assert.ok([303, 307, 308].includes(forbidden.status), 'Other roles must be redirected')
  const action = html.match(/name="(\$ACTION_ID_[^"]+)"/)
  assert.ok(action, 'Sign-out form must be present')
  const form = new FormData()
  form.set(action[1], '')
  const signedOut = await fetch(`${base}${path}`, { method: 'POST', headers: { ...headers, origin: base }, body: form, redirect: 'manual' })
  assert.equal(new URL(signedOut.headers.get('location'), base).pathname, '/login')
  assert.ok(signedOut.headers.getSetCookie().some(cookie => cookie.includes('Max-Age=0')), 'Sign out clears session cookies')
  console.log(`PASS ${role}: login, profile, dashboard, redirect, role protection, sign out`)
}

// A temporary account reproduces interrupted registration without touching real users.
const { createClient } = await import('@supabase/supabase-js')
const { randomUUID } = await import('node:crypto')
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = `portal-check-${randomUUID()}@example.com`
const password = randomUUID()
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'ADMIN' } })
assert.ifError(created.error)
try {
  const cookies = new Map()
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: values => values.forEach(({ name, value }) => cookies.set(name, value)),
  } })
  assert.ifError((await client.auth.signInWithPassword({ email, password })).error)
  const response = await fetch(`${base}/login`, { headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') }, redirect: 'manual' })
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/provider/dashboard')
  await fetch(`${base}/provider/dashboard`, { headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } })
  const profile = await admin.from('profiles').select('role').eq('id', created.data.user.id).single()
  assert.ifError(profile.error)
  assert.equal(profile.data.role, 'PROVIDER', 'Editable metadata must not grant admin access')
  console.log('PASS missing profile recovery and protection against role escalation')
} finally {
  assert.ifError((await admin.auth.admin.deleteUser(created.data.user.id)).error)
}
