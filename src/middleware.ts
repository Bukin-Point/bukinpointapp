import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/signin(.*)',
  '/signup(.*)',
  '/auth(.*)', // Catch-all for unified auth page
  '/book(.*)',
  '/api/webhooks(.*)',
  '/auth/redirect', // Allow redirect handler to run (it will check auth internally)
])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // SECURITY: Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const protocol = request.nextUrl.protocol
    if (protocol !== 'https:') {
      const httpsUrl = request.nextUrl.clone()
      httpsUrl.protocol = 'https:'
      return NextResponse.redirect(httpsUrl)
    }
  }

  // Skip subdomain routing for internal API routes
  if (request.nextUrl.pathname.startsWith('/api/internal/')) {
    return NextResponse.next()
  }

  // Handle authentication for protected routes
  const { userId } = await auth()
  const isPublic = isPublicRoute(request)

  // If route is protected and user is not authenticated, Clerk will handle redirect
  if (!isPublic && !userId) {
    return NextResponse.next()
  }

  // Subdomain routing logic (following Grok's pattern)
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''

  // Skip static assets and Next.js internals (following Grok's pattern)
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next()
  }

  // Remove port if present (e.g., "business-one.bukinpoint.test:3000")
  const hostWithoutPort = hostname.split(':')[0]

  // Extract subdomain following Grok's pattern: first part before domain
  let subdomain: string | null = null

  // Handle localhost
  if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
    // Check if it's a subdomain localhost (e.g., "business-one.localhost")
    if (hostWithoutPort.includes('.localhost') && hostWithoutPort.split('.').length >= 3) {
      subdomain = hostWithoutPort.split('.')[0].toLowerCase()
    } else {
      // Plain localhost - skip subdomain routing
      return NextResponse.next()
    }
  } else {
    // Handle .test domains and production domains
    const parts = hostWithoutPort.split('.')
    
    // Need at least 2 parts
    if (parts.length < 2) {
      return NextResponse.next()
    }

    // Handle .test and .localhost domains for development
    if (hostWithoutPort.includes('.test') || hostWithoutPort.includes('.localhost')) {
      const isTest = parts.includes('test')
      const isLocalhost = parts.includes('localhost')

      if ((isTest || isLocalhost) && parts.length >= 3) {
        // Has subdomain: subdomain.bukinpoint.test
        subdomain = parts[0].toLowerCase()
      } else {
        // Main domain: bukinpoint.test (no subdomain)
        return NextResponse.next()
      }
    } else {
      // Production: Extract subdomain if we have 3+ parts (subdomain.domain.tld)
      if (parts.length >= 3) {
        subdomain = parts[0].toLowerCase()
      } else {
        // Main domain: bukinpoint.com (no subdomain)
        return NextResponse.next()
      }
    }
  }

  // Skip main domains and reserved subdomains (following Grok's pattern)
  const mainDomains = ['www', 'app', 'api', 'admin', 'dev', 'stage', 'stagging', 'notifications', 'bukinpoint']
  if (!subdomain || mainDomains.includes(subdomain)) {
    return NextResponse.next()
  }

  // Check if subdomain exists in database - subdomains are ONLY for public booking pages
  // Use internal API route since Prisma doesn't work in Edge Runtime
  try {
    const baseUrl = request.nextUrl.origin
    const lookupUrl = new URL('/api/internal/subdomain-lookup', baseUrl)
    lookupUrl.searchParams.set('subdomain', subdomain)

    const response = await fetch(lookupUrl.toString(), {
      headers: {
        'x-internal-request': 'true', // Optional: add header to identify internal requests
      },
      cache: 'no-store', // Don't cache subdomain lookups
    })

    if (!response.ok) {
      throw new Error('Subdomain lookup failed')
    }

    const data = await response.json()

    if (!data.provider) {
      const mainDomain = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      return NextResponse.redirect(new URL(mainDomain))
    }

    if (data.provider.status !== 'ACTIVE') {
      const mainDomain = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      return NextResponse.redirect(new URL(mainDomain))
    }

    const provider = data.provider

    // Rewrite to booking page with providerId (subdomains are public booking pages only)
    // Following Grok's pattern: rewrite to dynamic route with provider context
    if (url.pathname === '/' || url.pathname === '/book') {
      url.pathname = `/book/${provider.id}`
      const response = NextResponse.rewrite(url)
      // Set headers for the rewritten request
      response.headers.set('x-provider-id', provider.id)
      response.headers.set('x-subdomain', subdomain)
      response.headers.set('x-rewritten', 'true')
      return response
    }

    // SECURITY: Don't allow auth pages or provider pages on subdomains - redirect to main domain
    // Subdomains are ONLY for public booking
    const protectedPaths = [
      '/signin',
      '/signup',
      '/auth',
      '/signup/provider',
      '/signup/staff',
      '/signup/customer',
      '/dashboard',
      '/services',
      '/staff',
      '/bookings',
      '/availability',
      '/wallet',
      '/settings',
      '/onboarding',
    ]
    if (protectedPaths.some(path => url.pathname.startsWith(path))) {
      const mainDomain = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      const redirectUrl = new URL(url.pathname + url.search, mainDomain)
      return NextResponse.redirect(redirectUrl)
    }

    // For booking page paths, add provider context via headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-provider-id', provider.id)
    requestHeaders.set('x-subdomain', subdomain)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error('Error in middleware subdomain lookup:', error)
    return NextResponse.next()
  }
})

export const config = {
  // Apply to all paths except static files and Next.js internals (following Grok's pattern)
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
}
