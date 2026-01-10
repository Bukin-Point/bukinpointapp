import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { OnboardingForm } from '@/components/provider/onboarding-form'

export default async function OnboardingPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Check if user already has a provider profile
  const existingProvider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
  })

  if (existingProvider) {
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
