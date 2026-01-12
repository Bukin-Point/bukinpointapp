'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function SignUpContent() {
  const searchParams = useSearchParams()

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

  // Determine redirect URL based on user type
  // Use dedicated redirect handlers that preserve flow context through email verification
  const afterSignUpUrl =
    userType === 'customer'
      ? '/auth/redirect-customer?flow=customer-signup'
      : '/auth/redirect-provider?flow=provider-signup'
  const forceRedirectUrl = afterSignUpUrl
  const fallbackRedirectUrl = afterSignUpUrl

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <Link
              href={userType === 'customer' ? '/signin?type=customer' : '/signin'}
              className="text-primary font-medium hover:underline"
            >
              Sign in
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
            className={cn('flex-1 transition-all', userType === 'provider' && 'shadow-sm')}
          >
            Provider
          </Button>
          <Button
            type="button"
            variant={userType === 'customer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setUserType('customer')}
            className={cn('flex-1 transition-all', userType === 'customer' && 'shadow-sm')}
          >
            Customer
          </Button>
        </div>

        {/* Sign Up Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold">
            Sign up as {userType === 'provider' ? 'Provider' : 'Customer'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {userType === 'provider'
              ? 'Create your business account and start managing your services'
              : 'Create your account to book services and track your appointments'}
          </p>
        </div>

        {/* Clerk Sign Up Component */}
        <SignUp
          routing="path"
          path="/signup"
          afterSignUpUrl={afterSignUpUrl}
          forceRedirectUrl={forceRedirectUrl}
          fallbackRedirectUrl={fallbackRedirectUrl}
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
              footer: { display: 'none' }, // Hide the footer with sign-in link
              captcha: {},
              alertText: {
                fontSize: '0.875rem',
              },
            },
          }}
        />
      </div>
    </div>
  )
}

export default function SignUpCatchAllPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
          <div className="w-full max-w-md">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}
