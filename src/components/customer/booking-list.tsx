'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RescheduleBookingModal } from './reschedule-booking-modal'
import { cancelBooking, rescheduleBooking } from '@/actions/bookings'
import { useToast } from '@/hooks/use-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCustomerBookings } from '@/actions/customer'
import { format } from 'date-fns'
import { Calendar, Ban } from 'lucide-react'

type BookingWithRelations = {
  id: string
  bookingDate: Date
  startTime: string
  endTime: string
  status: string
  notes: string | null
  service: {
    id: string
    name: string
    price: number | { toNumber: () => number }
  }
  provider: {
    id: string
    businessName: string
    industry: string
  }
  userProvider: {
    id: string
    user: {
      name: string | null
      email: string
    }
  }
}

interface CustomerBookingListProps {
  bookings: BookingWithRelations[]
  userId: string
  userEmail: string
}

export function CustomerBookingList({ bookings: initialBookings, userId, userEmail }: CustomerBookingListProps) {
  const { toast } = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<BookingWithRelations | null>(null)

  const { data: bookingsResult } = useQuery({
    queryKey: ['customerBookings', userId, userEmail],
    queryFn: async () => {
      const { getCustomerBookings, linkBookingsToAccount } = await import('@/actions/customer')
      await linkBookingsToAccount(userId, userEmail)
      return getCustomerBookings(userId, userEmail)
    },
    initialData: { success: true, bookings: initialBookings as any },
    staleTime: 30000,
  })

  const bookings = bookingsResult?.bookings || initialBookings

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId, 'customer'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerBookings', userId, userEmail] })
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: (vars: { bookingId: string; newDate: Date; newStartTime: string; newEndTime: string }) =>
      rescheduleBooking({ ...vars, initiatedBy: 'customer' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerBookings', userId, userEmail] })
    },
  })

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    setLoading(bookingId)
    try {
      const result = await cancelMutation.mutateAsync(bookingId)
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Booking cancelled successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel booking',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while cancelling the booking',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const handleReschedule = (booking: BookingWithRelations) => {
    setSelectedBookingForReschedule(booking)
    setIsRescheduleModalOpen(true)
  }

  const handleRescheduleSuccess = () => {
    setIsRescheduleModalOpen(false)
    setSelectedBookingForReschedule(null)
  }

  const canCancelOrReschedule = (booking: BookingWithRelations) => {
    return booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  }

  const getPrice = (price: number | { toNumber: () => number }) => {
    return typeof price === 'object' && 'toNumber' in price ? price.toNumber() : Number(price)
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-body-sm text-text-secondary">
            You don't have any bookings yet. Start booking services to see them here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
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
                      : 'outline'
                  }
                  className={
                    booking.status === 'PENDING'
                      ? 'bg-warning-light text-warning'
                      : ''
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
                    ₦{getPrice(booking.service.price).toLocaleString()}
                  </span>
                </div>
                {booking.notes && (
                  <div>
                    <span className="text-text-secondary">Notes:</span>
                    <p className="mt-1">{booking.notes}</p>
                  </div>
                )}
                {canCancelOrReschedule(booking) && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReschedule(booking)}
                      disabled={loading === booking.id}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(booking.id)}
                      disabled={loading === booking.id}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedBookingForReschedule && (
        <RescheduleBookingModal
          booking={selectedBookingForReschedule}
          open={isRescheduleModalOpen}
          onOpenChange={setIsRescheduleModalOpen}
          onSuccess={() => {
            handleRescheduleSuccess()
            queryClient.invalidateQueries({ queryKey: ['customerBookings', userId, userEmail] })
          }}
        />
      )}
    </>
  )
}
