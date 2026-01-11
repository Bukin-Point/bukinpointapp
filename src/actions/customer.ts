'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

export async function getCustomerBookings(userId: string) {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
      },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            industry: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        bookingDate: 'desc',
      },
    })

    return { success: true, bookings }
  } catch (error) {
    console.error('Error getting customer bookings:', error)
    return { error: 'Failed to get bookings', bookings: [] }
  }
}

export async function linkBookingsToAccount(userId: string, email: string) {
  try {
    // Link bookings that match the email but don't have a userId
    const result = await prisma.booking.updateMany({
      where: {
        customerEmail: email,
        userId: null,
      },
      data: {
        userId,
      },
    })

    // Don't revalidate during render - let Next.js handle it naturally
    // revalidatePath('/customer/dashboard')
    return { success: true, linkedCount: result.count }
  } catch (error) {
    console.error('Error linking bookings to account:', error)
    return { error: 'Failed to link bookings', linkedCount: 0 }
  }
}
