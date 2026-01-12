import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canManageStaff } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { BusinessDetailsForm } from '@/components/provider/business-details-form'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'

export default async function BusinessDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ providerId?: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // SECURITY: If on a subdomain, use the subdomain's provider ID (enforced by layout)
  const headersList = await headers()
  const subdomainProviderId = headersList.get('x-provider-id')
  
  const params = await searchParams
  // Prioritize subdomain provider ID over URL parameter for security
  const urlProviderId = subdomainProviderId || (params.providerId ? sanitizeProviderId(params.providerId) : undefined)

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id, urlProviderId)

  if (!accessContext) {
    if (urlProviderId) {
      return (
        <ProviderContextError
          userId={session.user.id}
          errorMessage="You don't have access to this provider or the provider doesn't exist."
        />
      )
    }
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
