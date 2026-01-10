import { SignInForm } from '@/components/auth/signin-form'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-h1 mb-2">Welcome Back</h1>
          <p className="text-body-sm text-text-secondary">
            Sign in to your BukinPoint account
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
