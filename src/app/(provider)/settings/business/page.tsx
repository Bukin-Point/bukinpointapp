import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess, canManageStaff } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { BusinessDetailsForm } from '@/components/provider/business-details-form'

export default async function BusinessDetailsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id)

  if (!accessContext) {
    redirect('/onboarding')
  }

  // Only providers and OWNER role staff can access settings
  if (!canManageStaff(accessContext)) {
    redirect('/dashboard')
  }

  const provider = await prisma.provider.findUnique({
    where: { id: accessContext.provider.id },
  })

  if (!provider) {
    redirect('/onboarding')
  }

  return (
    <div>
      <BusinessDetailsForm provider={provider} />
    </div>
  )
}
