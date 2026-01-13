import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-helpers-clerk'
import { BookingFlow } from '@/components/booking/booking-flow'

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerId?: string }>
  searchParams: Promise<{ serviceId?: string }>
}) {
  const { providerId } = await params
  const { serviceId } = await searchParams
  const session = await getSession()
  const headersList = await headers()
  const providerIdFromHeader = headersList.get('x-provider-id')

  // Use providerId from header (subdomain routing) or from params (direct URL)
  const finalProviderId = providerIdFromHeader || providerId

  if (!finalProviderId) {
    notFound()
  }

  const provider = await prisma.provider.findUnique({
    where: { id: finalProviderId },
    include: {
      services: {
        where: { isActive: true },
      },
      staff: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          services: {
            include: {
              service: true,
            },
          },
        },
      },
    },
  })

  if (!provider || provider.status !== 'ACTIVE') {
    notFound()
  }

  // Phone field is not yet in database - will be null until migration runs
  const userPhone: string | null = null

  // Serialize Decimal fields to numbers for client component
  const serializedProvider = {
    ...provider,
    services: provider.services.map(service => ({
      ...service,
      price: Number(service.price),
    })),
    staff: provider.staff.map(staff => ({
      ...staff,
      services: staff.services.map(staffService => ({
        ...staffService,
        service: {
          ...staffService.service,
          price: Number(staffService.service.price),
        },
      })),
    })),
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-h1 mb-2">Book with {provider.businessName}</h1>
            <p className="text-body-sm text-text-secondary">{provider.industry}</p>
          </div>
          <BookingFlow 
            provider={serializedProvider} 
            session={session} 
            initialServiceId={serviceId}
            userPhone={userPhone}
          />
        </div>
      </div>
    </div>
  )
}
