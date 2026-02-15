import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canManageStaff } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { StaffList } from '@/components/provider/staff-list'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'

export default async function StaffPage({
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

  // Only providers and OWNER role staff can manage staff
  if (!canManageStaff(accessContext)) {
    redirect('/dashboard')
  }

  const providerId = accessContext.provider.id

  const staff = await prisma.userProvider.findMany({
    where: { providerId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      roles: {
        include: {
          role: true
        }
      },
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const services = await prisma.service.findMany({
    where: { providerId, isActive: true },
  })

  // Convert Decimal fields to numbers for client component
  const serializedServices = services.map(service => ({
    ...service,
    price: Number(service.price),
  }))

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-h1 mb-2">Staff Members</h1>
        <p className="text-body-sm text-text-secondary">
          Manage your team members and their service assignments
        </p>
      </div>
      <StaffList staff={staff} services={serializedServices} providerId={providerId} />
    </div>
  )
}
