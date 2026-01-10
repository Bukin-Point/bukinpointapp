import { SignUpForm } from '@/components/auth/signup-form'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-h1 mb-2">Create Account</h1>
          <p className="text-body-sm text-text-secondary">
            Sign up to start using BukinPoint
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  )
}
