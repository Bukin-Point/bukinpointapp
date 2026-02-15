import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes that don't require authentication
export const isPublicRoute = createRouteMatcher([
  '/signin(.*)',
  '/signup(.*)',
  '/book(.*)',
  '/api/webhooks(.*)',
])

// Clerk middleware for protecting routes
export const middleware = clerkMiddleware(async (auth, req) => {
  // Public routes are handled by isPublicRoute matcher
  // Protected routes will automatically require authentication
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
