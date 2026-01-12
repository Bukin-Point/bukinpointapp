import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canEditServices, isStaff, getStaffRole } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { ServiceList } from '@/components/provider/service-list'
import { Badge } from '@/components/ui/badge'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'

export default async function ServicesPage({
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
  const canEdit = canEditServices(accessContext)
  const userIsStaff = isStaff(accessContext)
  const staffRole = getStaffRole(accessContext)

  // If user is STAFF role (not OWNER), only show services assigned to them
  let services
  if (userIsStaff && staffRole === 'STAFF') {
    services = await prisma.service.findMany({
      where: {
        providerId,
        staffServices: {
          some: {
            staff: {
              userId: session.user.id,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } else {
    // OWNER role and providers see all services
    services = await prisma.service.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Get total service count for STAFF role indicator
  const totalServicesCount = userIsStaff && staffRole === 'STAFF'
    ? await prisma.service.count({ where: { providerId } })
    : null

  // Convert Decimal fields to numbers for client component
  const serializedServices = services.map((service) => ({
    id: service.id,
    providerId: service.providerId,
    name: service.name,
    description: service.description,
    image: service.image,
    duration: service.duration,
    price: Number(service.price),
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">Services</h1>
        <div className="flex items-center gap-2">
          <p className="text-body-sm text-text-secondary">
            {canEdit ? 'Manage your service offerings' : 'View service offerings'}
          </p>
          {userIsStaff && staffRole === 'STAFF' && totalServicesCount !== null && (
            <Badge variant="outline" className="text-xs">
              Showing {services.length} of {totalServicesCount} services assigned to you
            </Badge>
          )}
        </div>
      </div>
      <ServiceList services={serializedServices} providerId={providerId} canEdit={canEdit} />
    </div>
  )
}
