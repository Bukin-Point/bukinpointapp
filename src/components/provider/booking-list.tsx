'use client'

import { useState } from 'react'
import { Booking } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { updateBookingStatus } from '@/actions/bookings'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react'

type BookingWithRelations = Booking & {
  service: {
    id: string
    name: string
  }
  staff: {
    user: {
      name: string | null
      email: string
    }
  }
}

interface BookingListProps {
  bookings: BookingWithRelations[]
  providerId: string
}

const STATUS_COLORS = {
  PENDING: 'bg-warning-light text-warning',
  CONFIRMED: 'bg-success-light text-success',
  CANCELLED: 'bg-gray-200 text-gray-600',
  COMPLETED: 'bg-primary-50 text-primary',
  NO_SHOW: 'bg-error-light text-error',
}

export function BookingList({ bookings: initialBookings, providerId }: BookingListProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true
    return booking.status === filter
  })

  const handleStatusUpdate = async (bookingId: string, newStatus: Booking['status']) => {
    setLoading(bookingId)
    try {
      const result = await updateBookingStatus(bookingId, newStatus)
      if (result.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        )
      } else {
        alert(result.error || 'Failed to update booking status')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('PENDING')}
        >
          Pending
        </Button>
        <Button
          variant={filter === 'CONFIRMED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('CONFIRMED')}
        >
          Confirmed
        </Button>
        <Button
          variant={filter === 'COMPLETED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('COMPLETED')}
        >
          Completed
        </Button>
      </div>

      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-body-sm text-text-secondary">
              No bookings found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-h4">{booking.service.name}</CardTitle>
                    <CardDescription>
                      Booking Ref: {booking.bookingRef}
                    </CardDescription>
                  </div>
                  <Badge className={STATUS_COLORS[booking.status]}>
                    {booking.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-body-sm">
                    <div>
                      <span className="text-text-secondary">Customer:</span>
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-caption">{booking.customerPhone}</p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Staff:</span>
                      <p className="font-medium">
                        {booking.staff.user.name || booking.staff.user.email}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Date:</span>
                      <p className="font-medium">
                        {format(new Date(booking.bookingDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-secondary">Time:</span>
                      <p className="font-medium">
                        {booking.startTime} - {booking.endTime}
                      </p>
                    </div>
                  </div>
                  {booking.notes && (
                    <div>
                      <span className="text-text-secondary text-body-sm">Notes:</span>
                      <p className="text-body-sm">{booking.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {booking.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'CONFIRMED')}
                          disabled={loading === booking.id}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(booking.id, 'CANCELLED')}
                          disabled={loading === booking.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(booking.id, 'COMPLETED')}
                          disabled={loading === booking.id}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Completed
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusUpdate(booking.id, 'NO_SHOW')}
                          disabled={loading === booking.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          No Show
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
