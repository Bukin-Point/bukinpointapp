import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

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

  // Handle authentication for protected routes
  const { userId } = await auth()
  const isPublic = isPublicRoute(request)

  // If route is protected and user is not authenticated, Clerk will handle redirect
  if (!isPublic && !userId) {
    return NextResponse.next()
  }

  // Subdomain routing logic
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''

  // Extract subdomain from hostname
  const parts = hostname.split('.')
  let subdomain = ''

  // Handle different hostname formats
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return NextResponse.next()
  }

  // Handle .test and .localhost domains for development
  if (hostname.includes('.test') || hostname.includes('.localhost')) {
    const domainParts = hostname.split('.')
    const isTest = domainParts.includes('test')
    const isLocalhost = domainParts.includes('localhost')

    if ((isTest || isLocalhost) && domainParts.length >= 3) {
      subdomain = domainParts[0].toLowerCase()
    } else if ((isTest || isLocalhost) && domainParts.length === 2) {
      return NextResponse.next()
    } else {
      return NextResponse.next()
    }
  } else {
    // Extract subdomain for production
    if (parts.length >= 2) {
      subdomain = parts[0].toLowerCase()
    }
  }

  // Skip main domains and reserved subdomains
  const mainDomains = ['www', 'app', 'api', 'admin', 'dev', 'stage', 'stagging']
  if (mainDomains.includes(subdomain) || !subdomain) {
    return NextResponse.next()
  }

  // Check if subdomain exists in database - subdomains are ONLY for public booking pages
  try {
    const provider = await prisma.provider.findUnique({
      where: { subdomain },
      select: {
        id: true,
        status: true,
      },
    })

    if (!provider) {
      const mainDomain = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      return NextResponse.redirect(new URL(mainDomain))
    }

    if (provider.status !== 'ACTIVE') {
      const mainDomain = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      return NextResponse.redirect(new URL(mainDomain))
    }

    // Rewrite to booking page with providerId (subdomains are public booking pages only)
    if (url.pathname === '/' || url.pathname === '/book') {
      url.pathname = `/book/${provider.id}`
      return NextResponse.rewrite(url)
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
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
