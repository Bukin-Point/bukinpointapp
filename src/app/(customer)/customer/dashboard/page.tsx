import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getCustomerBookings, linkBookingsToAccount } from '@/actions/customer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default async function CustomerDashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }


  const bookingsResult = await getCustomerBookings(session.user.id, session.user.email)
  const bookings = bookingsResult.bookings || []

  // Separate upcoming and past bookings
  const now = new Date()
  const upcomingBookings = bookings.filter(
    (booking) => new Date(booking.bookingDate) >= now && booking.status !== 'CANCELLED'
  )
  const pastBookings = bookings.filter(
    (booking) => new Date(booking.bookingDate) < now || booking.status === 'CANCELLED'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">My Dashboard</h1>
        <p className="text-body-sm text-text-secondary">
          View and manage your bookings
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-h2 font-semibold">{bookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-h2 font-semibold">{upcomingBookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Past Bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-h2 font-semibold">{pastBookings.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div>
          <h2 className="text-h3 mb-4">Upcoming Bookings</h2>
          <div className="space-y-4">
            {upcomingBookings.slice(0, 5).map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-h4">{booking.service.name}</CardTitle>
                      <CardDescription>{booking.provider.businessName}</CardDescription>
                    </div>
                    <Badge
                      variant={
                        booking.status === 'CONFIRMED'
                          ? 'default'
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
                        {booking.userProvider.user.name || booking.userProvider.user.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Price:</span>
                      <span className="font-medium">
                        ₦{Number(booking.service.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div>
          <h2 className="text-h3 mb-4">Past Bookings</h2>
          <div className="space-y-4">
            {pastBookings.slice(0, 5).map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-h4">{booking.service.name}</CardTitle>
                      <CardDescription>{booking.provider.businessName}</CardDescription>
                    </div>
                    <Badge
                      variant={
                        booking.status === 'COMPLETED'
                          ? 'default'
                          : booking.status === 'CANCELLED'
                          ? 'destructive'
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-body-sm text-text-secondary">
              You don't have any bookings yet. Start booking services to see them here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
