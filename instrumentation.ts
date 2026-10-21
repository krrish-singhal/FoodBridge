// Next.js Instrumentation hook - runs once when the server starts
// Guard with NEXT_RUNTIME check so the dns module is only loaded in Node.js (not Edge Runtime)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('dns')
    dns.default.setDefaultResultOrder('ipv4first')
    console.log('✅ DNS order set to ipv4first via instrumentation hook')
  }
}
