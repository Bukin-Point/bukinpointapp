import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { BookingList } from '@/components/provider/booking-list'

export default async function BookingsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
  })

  if (!provider) {
    redirect('/onboarding')
  }

  const bookings = await prisma.booking.findMany({
    where: { providerId: provider.id },
    include: {
      service: {
        select: {
          id: true,
          name: true,
        },
      },
      staff: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { bookingDate: 'desc' },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-h1 mb-2">Bookings</h1>
        <p className="text-body-sm text-text-secondary">
          View and manage customer bookings
        </p>
      </div>
      <BookingList bookings={bookings} providerId={provider.id} />
    </div>
  )
}
