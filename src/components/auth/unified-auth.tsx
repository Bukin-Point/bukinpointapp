'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignIn, SignUp } from '@clerk/nextjs'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CaptchaErrorHandler } from './captcha-error-handler'

type TabValue = 'customer' | 'provider'

export function UnifiedAuth() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabValue) || 'customer'
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab)
  const invitationToken = searchParams.get('invitationToken')
  const initialEmail = searchParams.get('email') || undefined

  // Check if we're in sign-up mode based on URL parameter
  const isSignUpMode = searchParams.get('mode') === 'sign-up'

  // Update tab if URL param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabValue
    if (tabParam && (tabParam === 'customer' || tabParam === 'provider')) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Determine redirect URLs based on tab
  const getCustomerSignInUrl = () => {
    if (invitationToken) {
      return `/signin/accept-invitation?token=${invitationToken}`
    }
    return '/auth/redirect'
  }

  const getCustomerSignUpUrl = () => {
    return '/customer/dashboard?flow=customer-signup'
  }

  const getProviderSignInUrl = () => {
    if (invitationToken) {
      return `/signin/accept-invitation?token=${invitationToken}`
    }
    return '/auth/redirect'
  }

  const getProviderSignUpUrl = () => {
    return '/onboarding?flow=provider-signup'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md">
        <CaptchaErrorHandler />
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="provider">Provider</TabsTrigger>
          </TabsList>

          <TabsContent value="customer">
            {isSignUpMode ? (
              <SignUp
                routing="path"
                path="/auth"
                signInUrl={`/auth?tab=customer`}
                forceRedirectUrl={getCustomerSignUpUrl()}
                fallbackRedirectUrl={getCustomerSignUpUrl()}
                initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
                appearance={{
                  elements: {
                    rootBox: 'mx-auto',
                    card: 'shadow-none',
                    captcha: {},
                    alertText: {
                      fontSize: '0.875rem',
                    },
                  },
                }}
              />
            ) : (
              <SignIn
                routing="path"
                path="/auth"
                signUpUrl={`/auth?tab=customer&mode=sign-up`}
                afterSignInUrl={getCustomerSignInUrl()}
                fallbackRedirectUrl="/customer/dashboard"
                initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
                appearance={{
                  elements: {
                    rootBox: 'mx-auto',
                    card: 'shadow-none',
                  },
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="provider">
            {isSignUpMode ? (
              <SignUp
                routing="path"
                path="/auth"
                signInUrl={`/auth?tab=provider`}
                forceRedirectUrl={getProviderSignUpUrl()}
                fallbackRedirectUrl={getProviderSignUpUrl()}
                initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
                appearance={{
                  elements: {
                    rootBox: 'mx-auto',
                    card: 'shadow-none',
                    captcha: {},
                    alertText: {
                      fontSize: '0.875rem',
                    },
                  },
                }}
              />
            ) : (
              <SignIn
                routing="path"
                path="/auth"
                signUpUrl={`/auth?tab=provider&mode=sign-up`}
                afterSignInUrl={getProviderSignInUrl()}
                fallbackRedirectUrl="/dashboard"
                initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
                appearance={{
                  elements: {
                    rootBox: 'mx-auto',
                    card: 'shadow-none',
                  },
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
