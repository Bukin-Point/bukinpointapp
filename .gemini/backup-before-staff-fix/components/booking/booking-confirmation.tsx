'use client'

import { useState, useEffect } from 'react'
import { Booking } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { CheckCircle, Home } from 'lucide-react'
import Link from 'next/link'
import { getBookingByRef } from '@/app/book/[providerId]/actions'

type BookingWithRelations = Booking & {
  service: { name: string; price: number }
  provider: { businessName: string }
  staff: { user: { name: string | null } }
}

export function BookingConfirmation({
  booking: initialBooking,
  session,
}: {
  booking: BookingWithRelations
  session?: { user: { id: string; name: string | null; email: string } } | null
}) {
  const [booking, setBooking] = useState(initialBooking)
  const [pollTimeout, setPollTimeout] = useState(false)

  useEffect(() => {
    if (booking.paymentStatus !== 'PENDING') return
    const t = setTimeout(() => setPollTimeout(true), 30_000)
    return () => clearTimeout(t)
  }, [booking.paymentStatus])

  useEffect(() => {
    if (booking.paymentStatus !== 'PENDING' || pollTimeout) return
    const id = setInterval(async () => {
      const res = await getBookingByRef(booking.bookingRef)
      if (res.booking && res.booking.paymentStatus === 'PAID') {
        setBooking(res.booking as BookingWithRelations)
      }
    }, 2500)
    return () => clearInterval(id)
  }, [booking.bookingRef, booking.paymentStatus, pollTimeout])

  const isPaid = booking.paymentStatus === 'PAID'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className={`rounded-full p-4 ${isPaid ? 'bg-success-light' : 'bg-muted'}`}>
              <CheckCircle className={`h-12 w-12 ${isPaid ? 'text-success' : 'text-muted-foreground'}`} />
            </div>
          </div>
          <h1 className="text-h1 mb-2">{isPaid ? 'Booking Confirmed!' : 'Confirming your payment…'}</h1>
          <p className="text-body-sm text-text-secondary">
            {isPaid
              ? 'Your appointment has been successfully booked. Payment received.'
              : pollTimeout
                ? "If payment was successful, you'll receive confirmation by email. Otherwise, please contact support or try again."
                : "If you've completed payment, this page will update shortly."}
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
                <p className="font-medium">{format(new Date(booking.bookingDate), 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-text-secondary">Time:</span>
                <p className="font-medium">{booking.startTime} - {booking.endTime}</p>
              </div>
              <div>
                <span className="text-text-secondary">Staff:</span>
                <p className="font-medium">{booking.staff.user.name || 'Not assigned'}</p>
              </div>
              <div>
                <span className="text-text-secondary">Price:</span>
                <p className="font-medium">₦{Number(booking.service.price).toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <Badge className={booking.status === 'PENDING' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}>
                {booking.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-2 flex-col sm:flex-row justify-center">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/"><Home className="h-4 w-4" />Go Back Home</Link>
          </Button>
          {session && (
            <Button asChild className="gap-2">
              <Link href="/customer/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
