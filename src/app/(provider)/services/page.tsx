import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess, canEditServices, isStaff, getStaffRole } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { ServiceList } from '@/components/provider/service-list'
import { Badge } from '@/components/ui/badge'

export default async function ServicesPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id)

  if (!accessContext) {
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
  const totalServicesCount =
    userIsStaff && staffRole === 'STAFF'
      ? await prisma.service.count({ where: { providerId } })
      : null

  // Convert Decimal fields to numbers for client component
  const serializedServices = services.map(service => ({
    ...service,
    price: Number(service.price),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
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
      </div>
      <ServiceList services={serializedServices} providerId={providerId} canEdit={canEdit} />
    </div>
  )
}
