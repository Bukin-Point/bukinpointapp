'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { sendBookingStatusUpdateEmail } from '@/lib/email'

// Define BookingStatus type from Prisma namespace (available even if client not generated)
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

// Statuses that should trigger customer email notifications
const NOTIFIABLE_STATUSES: BookingStatus[] = ['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  try {
    // Get booking with previous status before updating
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { name: true, price: true } },
        provider: { select: { businessName: true } },
        staff: { include: { user: { select: { name: true } } } },
      },
    })

    if (!booking) {
      return { error: 'Booking not found' }
    }

    const previousStatus = booking.status

    // Update booking status
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    })

    // Send status update email to customer if status changed to a notifiable status
    if (
      booking.customerEmail &&
      previousStatus !== status &&
      NOTIFIABLE_STATUSES.includes(status)
    ) {
      sendBookingStatusUpdateEmail({
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        bookingRef: booking.bookingRef,
        serviceName: booking.service.name,
        providerBusinessName: booking.provider.businessName,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        newStatus: status,
        previousStatus: previousStatus,
      }).catch(error => {
        console.error('Error sending booking status update email:', error)
      })
    }

    revalidatePath('/bookings')
    return { success: true }
  } catch (error) {
    console.error('Error updating booking status:', error)
    return { error: 'Failed to update booking status' }
  }
}

export async function getBookings(providerId: string) {
  try {
    const bookings = await prisma.booking.findMany({
      where: { providerId },
      include: {
        service: true,
        staff: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { bookingDate: 'desc' },
    })

    return { success: true, bookings }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return { error: 'Failed to fetch bookings' }
  }
}
