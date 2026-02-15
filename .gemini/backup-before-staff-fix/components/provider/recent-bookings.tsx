'use client'

import Link from 'next/link'
import { Booking } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Calendar, ArrowRight } from 'lucide-react'

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

interface RecentBookingsProps {
  bookings: BookingWithRelations[]
}

const STATUS_COLORS = {
  PENDING: 'bg-warning-light text-warning',
  CONFIRMED: 'bg-success-light text-success',
  CANCELLED: 'bg-gray-200 text-gray-600',
  COMPLETED: 'bg-primary-50 text-primary',
  NO_SHOW: 'bg-error-light text-error',
}

export function RecentBookings({ bookings }: RecentBookingsProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Your recent customer bookings</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-text-secondary opacity-50" />
          <p className="mt-4 text-body-sm text-text-secondary">
            No bookings yet. Bookings will appear here once customers start booking.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Your recent customer bookings</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/bookings">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{booking.service.name}</p>
                  <Badge className={STATUS_COLORS[booking.status]}>
                    {booking.status}
                  </Badge>
                </div>
                <p className="text-body-sm text-text-secondary">
                  {booking.customerName} • {booking.customerPhone}
                </p>
                <p className="text-caption text-text-secondary">
                  {format(new Date(booking.bookingDate), 'MMM dd, yyyy')} at{' '}
                  {booking.startTime}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
