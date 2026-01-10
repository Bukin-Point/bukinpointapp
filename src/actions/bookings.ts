'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { BookingStatus } from '@prisma/client'

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  try {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    })

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
