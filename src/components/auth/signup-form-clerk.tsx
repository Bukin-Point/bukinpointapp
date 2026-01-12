'use client'

import { SignUp } from '@clerk/nextjs'
import { CaptchaErrorHandler } from './captcha-error-handler'

export function SignUpFormClerk() {
  // Provider signup always goes to onboarding
  // The onboarding page will handle the flow parameter
  return (
    <div className="flex items-center justify-center">
      <CaptchaErrorHandler />
      <SignUp
        routing="path"
        path="/signup"
        signInUrl="/signin"
        afterSignUpUrl="/auth/redirect-provider?flow=provider-signup"
        forceRedirectUrl="/auth/redirect-provider?flow=provider-signup"
        fallbackRedirectUrl="/auth/redirect-provider?flow=provider-signup"
        appearance={{
          elements: {
            captcha: {
              // Ensure CAPTCHA loads properly
            },
            alertText: {
              // Make CAPTCHA errors less prominent
              fontSize: '0.875rem',
            },
          },
        }}
      />
    </div>
  )
}
