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

  let subdomain: string | null = null

  if (hostWithoutPort !== 'localhost' && hostWithoutPort !== '127.0.0.1') {
    const parts = hostWithoutPort.split('.')
    if (hostWithoutPort.endsWith('.localhost') && parts.length >= 2) {
      subdomain = parts[0].toLowerCase()
    } else if (hostWithoutPort.endsWith('.test') && parts.length >= 3) {
      subdomain = parts[0].toLowerCase()
    } else if (parts.length >= 3) {
      subdomain = parts[0].toLowerCase()
    }
  }

  // Skip main domains and reserved subdomains (following Grok's pattern)
  const mainDomains = [
    'www',
    'app',
    'api',
    'admin',
    'dev',
    'stage',
    'stagging',
    'notifications',
    'bukinpoint',
  ]
  if (!subdomain || mainDomains.includes(subdomain)) {
    return NextResponse.next()
  }

  // SECURITY: Don't allow auth pages on subdomains - redirect to main domain
  // Subdomains are for provider apps and public booking
  const protectedPaths = [
    '/signin',
    '/signup',
    '/auth',
    '/signup/provider',
    '/signup/staff',
    '/signup/customer',
    '/onboarding',
  ]

  if (protectedPaths.some(path => url.pathname.startsWith(path))) {
    let mainDomainStr = process.env.NEXT_PUBLIC_APP_URL
    if (!mainDomainStr) {
      const isLocal = process.env.NODE_ENV === 'development'
      const protocol = isLocal ? 'http:' : 'https:'
      const port = isLocal ? ':3000' : ''
      const baseDomain = isLocal
        ? (hostWithoutPort.endsWith('.test') ? 'bukinpoint.test' : 'localhost')
        : 'bukinpoint.com'
      mainDomainStr = `${protocol}//${baseDomain}${port}`
    }

    const redirectUrl = new URL(url.pathname + url.search, mainDomainStr)
    return NextResponse.redirect(redirectUrl)
  }

  // For booking page paths, add provider context via headers
  // Next.js app/page.tsx will natively handle rendering the provider landing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-subdomain', subdomain)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
})

export const config = {
  // Apply to all paths except static files and Next.js internals.
  // API routes MUST be included so Clerk middleware runs and auth() works in route handlers (e.g. /api/upload).
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public file extensions (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
}
