'use client'

import { SignUp } from '@clerk/nextjs'
import { CaptchaErrorHandler } from './captcha-error-handler'

export function CustomerSignUpFormClerk() {
  return (
    <div className="flex items-center justify-center">
      <CaptchaErrorHandler />
      <SignUp
        routing="path"
        path="/signup/customer"
        signInUrl="/signin"
        forceRedirectUrl="/customer/dashboard?flow=customer-signup"
        fallbackRedirectUrl="/customer/dashboard?flow=customer-signup"
        appearance={{
          elements: {
            captcha: {
              // Ensure CAPTCHA loads properly
            },
            alertText: {
              fontSize: '0.875rem',
            },
          },
        }}
      />
    </div>
  )
}
