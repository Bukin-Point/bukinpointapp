import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import {
  getRedirectContext,
  getSecureSubdomainRedirect,
  getProviderSubdomain,
  getStaffProviderSubdomain,
} from '@/lib/auth-redirect'
import { AuthRedirectClient } from '@/components/auth/auth-redirect-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProviderRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; type?: string; token?: string }>
}) {
  const params = await searchParams
  const flow = params?.flow
  const requestedType = params?.type
  const token = params?.token

  const session = await getSession()

  if (!session) {
    // If no session on server, let client-side handle it (session might not be available yet)
    return <AuthRedirectClient />
  }

  // Check Clerk metadata first for account type
  let accountTypeFromMetadata: 'provider' | 'staff' | 'customer' | null = null
  try {
    const clerkUser = await currentUser()
    if (clerkUser?.publicMetadata?.accountType) {
      accountTypeFromMetadata = clerkUser.publicMetadata.accountType as 'provider' | 'staff' | 'customer'
    }
  } catch (error) {
    console.warn('Error reading Clerk metadata:', error)
  }

  // Handle different signup flows - CHECK FLOW FIRST before other logic
  if (flow === 'provider-signup') {
    // IMPORTANT: Before redirecting to onboarding, check if user has pending staff invitations
    // If they do, accept them and redirect to dashboard instead
    try {
      const { prisma } = await import('@/lib/db')
      const pendingInvitation = await prisma.staffInvitation.findFirst({
        where: {
          email: session.user.email,
          expiresAt: { gt: new Date() },
          acceptedAt: null,
        },
        select: { id: true, token: true, providerId: true },
      })

      if (pendingInvitation) {
        // User has pending invitation - accept it and redirect to dashboard
        const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
        await Promise.race([
          checkAndAcceptPendingInvitations(session.user.id, session.user.email || ''),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])

        // Wait for staff member creation to complete
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Redirect to dashboard (staff don't need onboarding)
        redirect('/dashboard')
      }
    } catch (error) {
      console.warn('Error checking invitations, continuing with onboarding redirect:', error)
    }

    // No pending invitation - proceed with provider onboarding
    redirect('/onboarding?flow=provider-signup')
  } else if (flow === 'staff-signup') {
    // Staff signup - accept invitation and redirect to dashboard
    try {
      const { prisma } = await import('@/lib/db')
      
      // If token is provided, use it for more precise matching
      if (token) {
        const { acceptInvitationAfterSignup } = await import('@/actions/staff-invitations')
        const result = await Promise.race([
          acceptInvitationAfterSignup(token, session.user.id),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])
        
        if (result?.error) {
          console.warn('Error accepting invitation with token:', result.error)
          // Fall back to email-based check
        }
      } else {
        // Fall back to email-based check
        const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
        await Promise.race([
          checkAndAcceptPendingInvitations(session.user.id, session.user.email || ''),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.warn('Error accepting staff invitation:', error)
    }

    redirect('/dashboard')
  }

  // For signin, check for pending invitations first
  try {
    const { prisma } = await import('@/lib/db')
    const pendingInvitation = await prisma.staffInvitation.findFirst({
      where: {
        email: session.user.email,
        expiresAt: { gt: new Date() },
        acceptedAt: null,
      },
      select: { id: true, token: true, providerId: true },
    })

    if (pendingInvitation) {
      // User has pending invitation - accept it
      const { checkAndAcceptPendingInvitations } = await import('@/actions/staff-invitations')
      await Promise.race([
        checkAndAcceptPendingInvitations(session.user.id, session.user.email || ''),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
      ])

      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  } catch (error) {
    console.warn('Error checking invitations:', error)
  }

  // Get redirect context (checks database)
  const userId = session.user.id
  let context
  try {
    context = await Promise.race([
      getRedirectContext(userId, 'signin'),
      new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      ),
    ])
  } catch (err) {
    console.error('Error getting redirect context, using fallback:', err)
    // Use metadata if available, otherwise default to customer
    context = {
      userType: accountTypeFromMetadata || 'customer',
    }
  }

  // Update Clerk metadata if it's different from what we determined
  if (context.userType && context.userType !== accountTypeFromMetadata) {
    try {
      const clerkUser = await currentUser()
      if (clerkUser?.id) {
        const client = await clerkClient()
        await client.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            accountType: context.userType,
            ...(flow && { signupFlow: flow }),
          },
        })
      }
    } catch (error) {
      console.warn('Error updating Clerk metadata:', error)
      // Don't fail redirect if metadata update fails
    }
  }

  // If metadata says customer but we're in provider redirect, redirect to customer dashboard
  if (accountTypeFromMetadata === 'customer') {
    redirect('/customer/dashboard')
  }

  // Determine path based on context
  let path = '/dashboard'
  if (context.flow === 'provider-signup') {
    path = '/onboarding'
  } else if (context.userType === 'customer') {
    // Customer in provider redirect handler - redirect to customer dashboard
    redirect('/customer/dashboard')
  }

  // Get subdomain based on user type
  let subdomain: string | null = null
  if (context.userType === 'provider') {
    subdomain = await getProviderSubdomain(userId)
  } else if (context.userType === 'staff') {
    subdomain = await getStaffProviderSubdomain(userId)
  }

  // Get secure redirect URL (server-side validated)
  const redirectUrl = await getSecureSubdomainRedirect(userId, subdomain, path)

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // Fallback to main domain dashboard
  redirect(path)
}
