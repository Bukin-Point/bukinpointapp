'use client'

import { SignUp } from '@clerk/nextjs'
import { CaptchaErrorHandler } from './captcha-error-handler'

interface StaffSignUpFormClerkProps {
  invitationToken?: string
  invitationEmail?: string
}

export function StaffSignUpFormClerk({ invitationToken, invitationEmail }: StaffSignUpFormClerkProps) {
  const token = invitationToken || ''

  return (
    <div className="flex items-center justify-center">
      <div className="w-full">
        <CaptchaErrorHandler />
        {invitationEmail && (
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
            <p className="font-medium">Important:</p>
            <p>Please sign up using the email address: <strong>{invitationEmail}</strong></p>
            <p className="mt-1 text-xs">The invitation was sent to this specific email address.</p>
          </div>
        )}
        <SignUp
          routing="path"
          path="/signup/staff"
          signInUrl="/signin"
          afterSignUpUrl={`/signup/staff/accept?token=${token}`}
          forceRedirectUrl={`/signup/staff/accept?token=${token}`}
          fallbackRedirectUrl={`/signup/staff/accept?token=${token}`}
          initialValues={invitationEmail ? { emailAddress: invitationEmail } : undefined}
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
    </div>
  )
}
