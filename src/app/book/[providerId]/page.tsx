import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { BookingFlow } from '@/components/booking/booking-flow'

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ providerId: string }>
}) {
  const { providerId } = await params

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
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

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-h1 mb-2">Book with {provider.businessName}</h1>
            <p className="text-body-sm text-text-secondary">{provider.industry}</p>
          </div>
          <BookingFlow provider={provider} />
        </div>
      </div>
    </div>
  )
}
