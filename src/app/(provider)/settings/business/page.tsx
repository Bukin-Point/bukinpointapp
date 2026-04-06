import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canManageStaff } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { BusinessDetailsForm } from '@/components/provider/business-details-form'
import { BookingLinkShare } from '@/components/provider/booking-link-share'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'
import { resolveRequestTenant } from '@/lib/request-tenant'

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
  const tenant = await resolveRequestTenant()
  
  const params = await searchParams
  // Prioritize subdomain provider ID over URL parameter for security
  const urlProviderId = tenant.providerId || (params.providerId ? sanitizeProviderId(params.providerId) : undefined)

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id, urlProviderId || undefined)

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
    <div className="space-y-6">
      <BookingLinkShare subdomain={provider.subdomain} businessName={provider.businessName} />
      <BusinessDetailsForm provider={provider} />
    </div>
  )
}
