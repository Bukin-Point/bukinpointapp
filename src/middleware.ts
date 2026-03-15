import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAppUrl } from '@/lib/url'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/signin(.*)',
  '/signup(.*)',
  '/auth(.*)', // Catch-all for unified auth page
  '/book(.*)',
  '/api/webhooks(.*)',
  '/api/health', // Health check endpoint for diagnostics
  '/auth/redirect', // Allow redirect handler to run (it will check auth internally)
])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Skip subdomain routing for internal API routes
  if (request.nextUrl.pathname.startsWith('/api/internal/')) {
    return NextResponse.next()
  }

  // Check if route is public FIRST, before calling auth()
  const isPublic = isPublicRoute(request)

  // For public routes, skip auth entirely
  if (isPublic) {
    return NextResponse.next()
  }

  // Handle authentication for protected routes
  // Wrap in try-catch to prevent crashes on Vercel preview URLs with dev keys
  try {
    const { userId } = await auth()
    if (!userId) {
      // Not authenticated on a protected route - let Clerk handle redirect
      return NextResponse.next()
    }
  } catch (error) {
    console.error('[Middleware] Auth error:', error)
    // On auth error, let the request through - page-level auth will handle it
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
    if (hostWithoutPort.endsWith('.vercel.app')) {
      const baseName = hostWithoutPort.replace('.vercel.app', '')
      const parts = baseName.split('.')
      if (parts.length >= 2) {
        subdomain = parts[0].toLowerCase()
      } else {
        subdomain = null
      }
    } else {
      const parts = hostWithoutPort.split('.')
      if (hostWithoutPort.endsWith('.localhost') && parts.length >= 2) {
        subdomain = parts[0].toLowerCase()
      } else if (hostWithoutPort.endsWith('.test') && parts.length >= 3) {
        subdomain = parts[0].toLowerCase()
      } else if (parts.length >= 3) {
        subdomain = parts[0].toLowerCase()
      }
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
    const mainDomainStr = getAppUrl()

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
    '/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)',
  ],
}
