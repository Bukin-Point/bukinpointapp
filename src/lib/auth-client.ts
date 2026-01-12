'use client'

// Re-export auth hooks for backward compatibility
// These components should eventually be migrated to use Clerk components directly
export { useSession, useSignUp, useSignIn, useSignOut } from '@/hooks/use-auth'

// Export Clerk's signUp and signIn for programmatic use
// Note: These components should ideally use Clerk's built-in components
import { useSignUp as useClerkSignUp, useSignIn as useClerkSignIn, useClerk } from '@clerk/nextjs'

// Create a wrapper that matches the old Better Auth API
export function useSignUpClient() {
  const { signUp } = useClerkSignUp()
  return {
    email: async (
      data: { email: string; password: string; name: string },
      callbacks?: {
        onRequest?: () => void
        onResponse?: () => void
        onError?: (ctx: {
          error: { message: string; status?: number; data?: Record<string, string> }
        }) => void
        onSuccess?: () => void
      }
    ) => {
      if (!signUp) {
        if (callbacks?.onError) {
          callbacks.onError({
            error: { message: 'Sign up is not available', status: 503 },
          })
        }
        return
      }
      if (callbacks?.onRequest) callbacks.onRequest()
      try {
        await signUp.create({
          emailAddress: data.email,
          password: data.password,
          firstName: data.name.split(' ')[0] || data.name,
          lastName: data.name.split(' ').slice(1).join(' ') || '',
        })
        if (callbacks?.onResponse) callbacks.onResponse()
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
        if (callbacks?.onSuccess) callbacks.onSuccess()
      } catch (error: any) {
        const firstError = Array.isArray(error.errors) ? error.errors[0] : undefined
        const derivedData =
          error.data ??
          (firstError?.meta?.paramName
            ? { [firstError.meta.paramName]: firstError.message }
            : undefined)

        if (callbacks?.onError) {
          callbacks.onError({
            error: {
              message: error.errors?.[0]?.message || error.message || 'Sign up failed',
              status: error.status,
              data: derivedData,
            },
          })
        }
      }
    },
  }
}

export function useSignInClient() {
  const { signIn } = useClerkSignIn()
  const { setActive } = useClerk()
  return {
    email: async (
      data: { email: string; password: string },
      callbacks?: {
        onRequest?: () => void
        onResponse?: () => void
        onError?: (ctx: { error: { message: string; status?: number } }) => void
        onSuccess?: () => void
      }
    ) => {
      if (!signIn || !setActive) {
        if (callbacks?.onError) {
          callbacks.onError({
            error: { message: 'Sign in is not available', status: 503 },
          })
        }
        return
      }
      if (callbacks?.onRequest) callbacks.onRequest()
      try {
        const result = await signIn.create({
          identifier: data.email,
          password: data.password,
        })
        if (callbacks?.onResponse) callbacks.onResponse()
        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId })
        }
        if (callbacks?.onSuccess) callbacks.onSuccess()
      } catch (error: any) {
        if (callbacks?.onError) {
          callbacks.onError({
            error: {
              message: error.errors?.[0]?.message || error.message || 'Sign in failed',
              status: error.status,
            },
          })
        }
      }
    },
  }
}

// For backward compatibility - export hooks that match the old API
export const signUp = useSignUpClient
export const signIn = useSignInClient
