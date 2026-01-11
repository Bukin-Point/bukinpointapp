import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getPostSigninRedirectUrl } from '@/actions/auth'
import { AuthRedirectClient } from '@/components/auth/auth-redirect-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AuthRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>
}) {
  const params = await searchParams
  const flow = params?.flow

  const session = await getSession()

  if (!session) {
    // If no session on server, let client-side handle it (session might not be available yet)
    return <AuthRedirectClient />
  }

  // Handle different signup flows - CHECK FLOW FIRST before other logic
  // Use server-side redirect() for immediate redirect without client-side delay
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
  } else if (flow === 'customer-signup') {
    redirect('/customer/dashboard?flow=customer-signup')
  } else if (flow === 'staff-signup') {
    redirect('/dashboard')
  }

  // For signin or no flow specified, get redirect URL based on user state
  const redirectUrl = await getPostSigninRedirectUrl()

  if (redirectUrl) {
    redirect(redirectUrl)
  }

  // Fallback
  redirect('/dashboard')
}
