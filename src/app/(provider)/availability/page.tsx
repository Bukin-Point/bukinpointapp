import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canManageStaff, isStaff } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { AvailabilityManager } from '@/components/provider/availability-manager'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'
import { resolveRequestTenant } from '@/lib/request-tenant'

export default async function AvailabilityPage({
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

  const providerId = accessContext.provider.id
  const canManage = canManageStaff(accessContext)
  const userIsStaff = isStaff(accessContext)

  // If staff (not OWNER), only show their own availability
  const staffWhere: any = { providerId, isActive: true }

  if (userIsStaff && !canManage) {
    // STAFF role can only see their own availability
    const userProvider = await prisma.userProvider.findFirst({
      where: {
        providerId,
        userId: session.user.id,
      },
    })

    if (userProvider) {
      staffWhere.id = userProvider.id
    } else {
      redirect('/dashboard')
    }
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { timezone: true },
  })

  if (!provider) {
    redirect('/onboarding')
  }

  const staff = await prisma.userProvider.findMany({
    where: staffWhere,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      availability: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-h1 mb-2">Availability</h1>
        <p className="text-body-sm text-text-secondary">
          {canManage
            ? 'Set working hours and availability for your staff members'
            : 'Set your working hours and availability'}
        </p>
      </div>
      <AvailabilityManager userProviders={staff} providerId={providerId} timezone={provider.timezone} canManage={canManage} />
    </div>
  )
}
