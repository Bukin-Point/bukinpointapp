import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { OnboardingForm } from '@/components/provider/onboarding-form'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const params = await searchParams
  const flow = params?.flow

  // Check if user has provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id)

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

  if (acceptedInvitation && flow !== 'provider-signup') {
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
