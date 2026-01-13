import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getCustomerBookings, linkBookingsToAccount } from '@/actions/customer'
import { CustomerBookingList } from '@/components/customer/booking-list'

export default async function CustomerBookingsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Link any existing bookings by email synchronously before fetching
  if (session.user.email) {
    await linkBookingsToAccount(session.user.id, session.user.email)
  }

  const bookingsResult = await getCustomerBookings(session.user.id, session.user.email)
  const bookings = bookingsResult.bookings || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">My Bookings</h1>
        <p className="text-body-sm text-text-secondary">
          View all your booking history
        </p>
      </div>

      <CustomerBookingList bookings={bookings} userId={session.user.id} userEmail={session.user.email} />
    </div>
  )
}
