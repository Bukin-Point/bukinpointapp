import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess, canViewAllBookings } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { BookingList } from '@/components/provider/booking-list'

export default async function BookingsPage() {
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
  const canViewAll = canViewAllBookings(accessContext)

  // Build booking where clause
  const bookingWhere: any = { providerId }

  // If staff, filter to only their bookings
  if (!canViewAll && 'staffMember' in accessContext) {
    const staffMember = await prisma.staffMember.findFirst({
      where: {
        providerId,
        userId: session.user.id,
      },
    })

    if (staffMember) {
      bookingWhere.staffId = staffMember.id
    }
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
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
        <p className="text-body-sm text-text-secondary">View and manage customer bookings</p>
      </div>
      <BookingList bookings={bookings} providerId={providerId} />
    </div>
  )
}
