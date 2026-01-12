'use client'

import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function SignInContent() {
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('invitationToken')
  const initialEmail = searchParams.get('email') || undefined
  
  // Get user type from URL, default to 'provider'
  const typeParam = searchParams.get('type')
  const [userType, setUserType] = useState<'provider' | 'customer'>(
    (typeParam === 'customer' ? 'customer' : 'provider') as 'provider' | 'customer'
  )

  // Update URL when user type changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (userType === 'provider') {
      params.delete('type')
    } else {
      params.set('type', 'customer')
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
    window.history.replaceState({}, '', newUrl)
  }, [userType, searchParams])

  // Determine redirect URL - use dedicated redirect handlers
  const redirectUrl = invitationToken 
    ? `/signin/accept-invitation?token=${invitationToken}`
    : userType === 'customer'
    ? `/auth/redirect-customer?type=customer`
    : `/auth/redirect-provider?type=provider`

  const fallbackRedirect = userType === 'customer' ? '/customer/dashboard' : '/dashboard'

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link 
              href={userType === 'customer' ? '/signup?type=customer' : '/signup'} 
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* User Type Toggle */}
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-background p-1">
          <Button
            type="button"
            variant={userType === 'provider' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setUserType('provider')}
            className={cn(
              'flex-1 transition-all',
              userType === 'provider' && 'shadow-sm'
            )}
          >
            Provider
          </Button>
          <Button
            type="button"
            variant={userType === 'customer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setUserType('customer')}
            className={cn(
              'flex-1 transition-all',
              userType === 'customer' && 'shadow-sm'
            )}
          >
            Customer
          </Button>
        </div>

        {/* Sign In Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">
            Sign in as {userType === 'provider' ? 'Provider' : 'Customer'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {userType === 'provider' 
              ? 'Access your business dashboard and manage your services'
              : 'View your bookings and manage your account'}
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <SignIn
          routing="path"
          path="/signin"
          afterSignInUrl={redirectUrl}
          fallbackRedirectUrl={fallbackRedirect}
          initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
              footer: { display: 'none' }, // Hide the footer with sign-up link
            },
          }}
        />
      </div>
    </div>
  )
}

export default function SignInCatchAllPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
