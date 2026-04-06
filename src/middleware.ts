import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAppUrl } from '@/lib/url'
import { extractTenantSubdomain, normalizeHostname } from '@/lib/tenant-host'

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
  const url = request.nextUrl.clone()
  const hostname = normalizeHostname(
    request.headers.get('x-forwarded-host') || request.headers.get('host')
  )

  // Skip static assets and Next.js internals (following Grok's pattern)
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next()
  }

  const subdomain = extractTenantSubdomain(hostname)
  const requestHeaders = new Headers(request.headers)

  if (subdomain) {
    requestHeaders.set('x-subdomain', subdomain)
    requestHeaders.set('x-tenant-host', hostname)
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

  if (subdomain && protectedPaths.some(path => url.pathname.startsWith(path))) {
    const mainDomainStr = getAppUrl()

    const redirectUrl = new URL(url.pathname + url.search, mainDomainStr)
    return NextResponse.redirect(redirectUrl)
  }

  // Skip subdomain routing for internal API routes, but preserve normalized tenant headers.
  if (request.nextUrl.pathname.startsWith('/api/internal/')) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Check route visibility after tenant headers are prepared.
  if (!isPublicRoute(request)) {
    try {
      await auth()
    } catch (error) {
      console.error('[Middleware] Auth error:', {
        error,
        host: hostname,
        path: url.pathname,
        subdomain,
      })
    }
  }

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
