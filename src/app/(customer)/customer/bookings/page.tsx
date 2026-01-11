import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getCustomerBookings } from '@/actions/customer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default async function CustomerBookingsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const bookingsResult = await getCustomerBookings(session.user.id)
  const bookings = bookingsResult.bookings || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">My Bookings</h1>
        <p className="text-body-sm text-text-secondary">
          View all your booking history
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-body-sm text-text-secondary">
              You don't have any bookings yet. Start booking services to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-h4">{booking.service.name}</CardTitle>
                    <CardDescription>{booking.provider.businessName}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      booking.status === 'CONFIRMED' || booking.status === 'COMPLETED'
                        ? 'default'
                        : booking.status === 'CANCELLED'
                        ? 'destructive'
                        : booking.status === 'PENDING'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date:</span>
                    <span className="font-medium">
                      {format(new Date(booking.bookingDate), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Time:</span>
                    <span className="font-medium">
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Staff:</span>
                    <span className="font-medium">
                      {booking.staff.user.name || booking.staff.user.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Price:</span>
                    <span className="font-medium">
                      ₦{Number(booking.service.price).toLocaleString()}
                    </span>
                  </div>
                  {booking.notes && (
                    <div>
                      <span className="text-text-secondary">Notes:</span>
                      <p className="mt-1">{booking.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
