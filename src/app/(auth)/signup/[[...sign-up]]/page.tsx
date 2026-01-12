import { SignUp } from '@clerk/nextjs'

export default function SignUpCatchAllPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md">
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/signin"
          afterSignUpUrl="/onboarding?flow=provider-signup"
          forceRedirectUrl="/onboarding?flow=provider-signup"
          fallbackRedirectUrl="/onboarding?flow=provider-signup"
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
      </div>
    </div>
  )
}
