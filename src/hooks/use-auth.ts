'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { getRedirectContext } from '@/lib/auth-redirect'
import { getRedirectPath } from '@/lib/auth-utils'

/**
 * Query hook for current session
 * Replaces Better Auth's useSession with Clerk + TanStack Query
 */
export function useSession() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()

  return useQuery({
    queryKey: ['session', userId],
    queryFn: async () => {
      if (!isSignedIn || !userId || !user) {
        return null
      }

      return {
        user: {
          id: userId,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.firstName || null,
          image: user.imageUrl || null,
        },
        isSignedIn: true,
      }
    },
    enabled: isLoaded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Query hook for redirect URL after authentication
 * Determines where to redirect user based on their role and flow
 */
export function useRedirectAfterAuth(flow?: 'provider-signup' | 'staff-signup' | 'customer-signup' | 'signin' | null) {
  const { userId } = useAuth()
  const router = useRouter()

  return useQuery({
    queryKey: ['redirect-after-auth', userId, flow],
    queryFn: async () => {
      if (!userId) return null

      const context = await getRedirectContext(userId, flow || 'signin')
      // Providers and staff work on root domain - return simple path
      return getRedirectPath(context)
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh redirect URL
  })
}

/**
 * Mutation hook for sign in
 */
export function useSignIn() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { signIn } = useAuth()

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      // Clerk handles sign in via their components, but we can use this for programmatic sign in
      // For now, we'll use Clerk's built-in sign in flow
      throw new Error('Use Clerk SignIn component for sign in')
    },
    onSuccess: () => {
      // Invalidate session query to refetch
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

/**
 * Mutation hook for sign up
 */
export function useSignUp() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { signUp } = useAuth()

  return useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      // Clerk handles sign up via their components
      throw new Error('Use Clerk SignUp component for sign up')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

/**
 * Mutation hook for sign out
 */
export function useSignOut() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { signOut } = useAuth()

  return useMutation({
    mutationFn: async () => {
      await signOut()
    },
    onSuccess: () => {
      queryClient.clear() // Clear all queries on sign out
      router.push('/signin')
    },
  })
}
