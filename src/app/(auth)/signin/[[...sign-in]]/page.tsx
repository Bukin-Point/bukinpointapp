'use client'

import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export default function SignInCatchAllPage() {
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('invitationToken')
  const initialEmail = searchParams.get('email') || undefined

  // Determine redirect URL - if there's an invitation token, redirect to accept it
  const redirectUrl = invitationToken 
    ? `/signin/accept-invitation?token=${invitationToken}`
    : '/auth/redirect'

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md">
        <SignIn
          routing="path"
          path="/signin"
          signUpUrl="/signup"
          afterSignInUrl={redirectUrl}
          fallbackRedirectUrl="/dashboard"
          initialValues={initialEmail ? { emailAddress: initialEmail } : undefined}
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none',
            },
          }}
        />
      </div>
    </div>
  )
}
