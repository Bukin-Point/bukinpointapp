'use client'

import { SignUp } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function SignUpContent() {
  const searchParams = useSearchParams()

  // Get user type from URL once, don't rewrite it
  const typeParam = searchParams.get('type')
  const userType = typeParam === 'customer' ? 'customer' : 'provider'

  // Determine redirect URL based on user type
  const afterSignUpUrl =
    userType === 'customer'
      ? '/auth/redirect-customer?flow=customer-signup'
      : '/auth/redirect-provider?flow=provider-signup'

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
          <Link
            href="/signup"
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-all',
              userType === 'provider' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-text-secondary hover:bg-surface'
            )}
          >
            Provider
          </Link>
          <Link
            href="/signup?type=customer"
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-all',
              userType === 'customer' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-text-secondary hover:bg-surface'
            )}
          >
            Customer
          </Link>
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

        {/* Clerk Sign Up component */}
        <SignUp
          routing="path"
          path="/signup"
          afterSignUpUrl={afterSignUpUrl}
          forceRedirectUrl={afterSignUpUrl}
          fallbackRedirectUrl={afterSignUpUrl}
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
              footer: { display: 'none' }, // Hide the footer with sign-in link
              alertText: { fontSize: '0.875rem' },
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
