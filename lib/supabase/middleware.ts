import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // FAST PATH: If the route is a public static file or API, don't hit Supabase Auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return supabaseResponse
  }

  // Only check auth if we are hitting a protected route or login/register
  const isProtectedRoute = pathname.startsWith('/provider') || pathname.startsWith('/ngo') || pathname.startsWith('/admin') || pathname.startsWith('/csr')
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  if (!isProtectedRoute && !isAuthRoute && pathname !== '/') {
    // It's a public page (like /about, etc), bypass auth fetch for speed
    return supabaseResponse
  }

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('Supabase auth threw an exception (Network/Timeout):', err)
    user = null // Default to unauthenticated if network fails
  }

  // Auth Protection Logic
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const trustedRole = user.app_metadata?.role
    const role = ['PROVIDER', 'NGO', 'ADMIN', 'CSR'].includes(trustedRole) ? trustedRole : 'PROVIDER'

    if (pathname.startsWith('/provider') && role !== 'PROVIDER') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/ngo') && role !== 'NGO') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/csr') && role !== 'CSR') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    
    // Redirect authenticated users away from login/register
    if (isAuthRoute || pathname === '/') {
      const url = request.nextUrl.clone()
      if (role === 'PROVIDER') url.pathname = '/provider/dashboard'
      else if (role === 'NGO') url.pathname = '/ngo/dashboard'
      else if (role === 'ADMIN') url.pathname = '/admin/dashboard'
      else if (role === 'CSR') url.pathname = '/csr/dashboard'
      else url.pathname = '/'
      // Prevent redirect loop if already on the correct dashboard
      if (request.nextUrl.pathname !== url.pathname) {
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
