'use client'

import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export function SignInFormClerk() {
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('invitationToken')
  const initialEmail = searchParams.get('email') || undefined

  // Determine redirect URL
  let redirectUrl = '/auth/redirect'
  if (invitationToken) {
    redirectUrl = `/signin/accept-invitation?token=${invitationToken}`
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <SignIn
        routing="path"
        path="/signin"
        signUpUrl="/signup"
        afterSignInUrl={redirectUrl}
        fallbackRedirectUrl="/dashboard"
        initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
      />
    </div>
  )
}
