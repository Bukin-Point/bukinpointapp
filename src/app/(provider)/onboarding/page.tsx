import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { OnboardingForm } from '@/components/provider/onboarding-form'

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>
}) {
  const params = await searchParams
  const flow = params?.flow

  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // CRITICAL: Before checking anything else, check if user has pending staff invitations
  // If they do, accept them and redirect to dashboard (staff don't need onboarding)
  try {
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

      // Wait for staff member creation to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Redirect to dashboard (staff don't need onboarding)
      // redirect() throws NEXT_REDIRECT exception - don't catch it, let it propagate
      redirect('/dashboard')
    }
  } catch (error: any) {
    // Don't catch NEXT_REDIRECT exceptions - they're how Next.js handles redirects
    if (error?.digest === 'NEXT_REDIRECT' || error?.message === 'NEXT_REDIRECT') {
      // Re-throw redirect exceptions so Next.js can handle them
      throw error
    }
    console.warn('Error checking invitations in onboarding page, continuing:', error)
  }

  // Check if user has provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id)

  // Check if user has already completed onboarding
  let onboardingCompleted = false
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, onboardingCompleted: true },
    })
    onboardingCompleted = user?.onboardingCompleted ?? false
  } catch (error) {
    // Fallback: If onboardingCompleted field doesn't exist yet (during migration), check staff/provider records
    console.warn('onboardingCompleted field not available, falling back to staff/provider check:', error)
    if (accessContext && 'staffMember' in accessContext) {
      onboardingCompleted = true // Staff don't need onboarding
    } else if (accessContext && !('staffMember' in accessContext)) {
      onboardingCompleted = true // Provider already has profile
    }
  }

  // If user has completed onboarding, redirect to dashboard
  // IMPORTANT: Even if flow=provider-signup, if onboardingCompleted is true (staff member), redirect to dashboard
  if (onboardingCompleted) {
    redirect('/dashboard')
  }

  // If user is staff, redirect to dashboard (staff don't need onboarding)
  if (accessContext && 'staffMember' in accessContext) {
    redirect('/dashboard')
  }

  // If user already has a provider profile, redirect to dashboard
  // BUT: If flow=provider-signup, allow them to stay (they just signed up)
  if (accessContext && !('staffMember' in accessContext) && flow !== 'provider-signup') {
    redirect('/dashboard')
  }

  // Check if user has any accepted staff invitation (fallback for race condition)
  // This handles cases where staff member record might not be created yet but invitation is accepted
  const acceptedInvitation = await prisma.staffInvitation.findFirst({
    where: {
      email: session.user.email,
      acceptedAt: { not: null },
    },
  })

  // If user has accepted invitation, redirect to dashboard (even if flow=provider-signup)
  // This handles cases where invitation was accepted but staff member record might not be created yet
  if (acceptedInvitation) {
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-h1 mb-2">Welcome to BukinPoint</h1>
          <p className="text-body-sm text-text-secondary">
            Let's set up your business profile to get started
          </p>
        </div>
        <OnboardingForm userId={session.user.id} />
      </div>
    </div>
  )
}
