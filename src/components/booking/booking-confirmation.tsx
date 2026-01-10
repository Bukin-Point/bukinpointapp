import { Booking } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CheckCircle } from 'lucide-react'

type BookingWithRelations = Booking & {
  service: {
    name: string
    price: number
  }
  provider: {
    businessName: string
  }
  staff: {
    user: {
      name: string | null
    }
  }
}

export function BookingConfirmation({ booking }: { booking: BookingWithRelations }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-success-light p-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
          </div>
          <h1 className="text-h1 mb-2">Booking Confirmed!</h1>
          <p className="text-body-sm text-text-secondary">
            Your appointment has been successfully booked
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
            <CardDescription>Reference: {booking.bookingRef}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-body-sm">
              <div>
                <span className="text-text-secondary">Service:</span>
                <p className="font-medium">{booking.service.name}</p>
              </div>
              <div>
                <span className="text-text-secondary">Provider:</span>
                <p className="font-medium">{booking.provider.businessName}</p>
              </div>
              <div>
                <span className="text-text-secondary">Date:</span>
                <p className="font-medium">
                  {format(new Date(booking.bookingDate), 'MMMM d, yyyy')}
                </p>
              </div>
              <div>
                <span className="text-text-secondary">Time:</span>
                <p className="font-medium">
                  {booking.startTime} - {booking.endTime}
                </p>
              </div>
              <div>
                <span className="text-text-secondary">Staff:</span>
                <p className="font-medium">
                  {booking.staff.user.name || 'Not assigned'}
                </p>
              </div>
              <div>
                <span className="text-text-secondary">Price:</span>
                <p className="font-medium">
                  ₦{Number(booking.service.price).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Badge className={booking.status === 'PENDING' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}>
                {booking.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
