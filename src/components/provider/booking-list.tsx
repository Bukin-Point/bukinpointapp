'use client'

import { useState, useMemo } from 'react'
import { Booking } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { updateBookingStatus } from '@/actions/bookings'
import { BookingTable } from './booking-table'
import { BookingDetailsModal } from './booking-details-modal'

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

export function BookingList({ bookings: initialBookings, providerId }: BookingListProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (filter === 'all') return true
      return booking.status === filter
    })
  }, [bookings, filter])

  // Count bookings by status for filter badges
  const statusCounts = useMemo(() => {
    return {
      all: bookings.length,
      PENDING: bookings.filter((b) => b.status === 'PENDING').length,
      CONFIRMED: bookings.filter((b) => b.status === 'CONFIRMED').length,
      COMPLETED: bookings.filter((b) => b.status === 'COMPLETED').length,
      CANCELLED: bookings.filter((b) => b.status === 'CANCELLED').length,
      NO_SHOW: bookings.filter((b) => b.status === 'NO_SHOW').length,
    }
  }, [bookings])

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

  const handleViewDetails = (booking: BookingWithRelations) => {
    setSelectedBooking(booking)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
          {statusCounts.all > 0 && (
            <span className="ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
              {statusCounts.all}
            </span>
          )}
        </Button>
        <Button
          variant={filter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('PENDING')}
        >
          Pending
          {statusCounts.PENDING > 0 && (
            <span className="ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
              {statusCounts.PENDING}
            </span>
          )}
        </Button>
        <Button
          variant={filter === 'CONFIRMED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('CONFIRMED')}
        >
          Confirmed
          {statusCounts.CONFIRMED > 0 && (
            <span className="ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
              {statusCounts.CONFIRMED}
            </span>
          )}
        </Button>
        <Button
          variant={filter === 'COMPLETED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('COMPLETED')}
        >
          Completed
          {statusCounts.COMPLETED > 0 && (
            <span className="ml-2 rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
              {statusCounts.COMPLETED}
            </span>
          )}
        </Button>
      </div>

      {/* Table */}
      <BookingTable
        bookings={filteredBookings}
        onViewDetails={handleViewDetails}
        onStatusUpdate={handleStatusUpdate}
        loading={loading}
      />

      {/* Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onStatusUpdate={handleStatusUpdate}
        loading={loading === selectedBooking?.id}
      />
    </div>
  )
}
