'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

export async function getCustomerBookings(userId: string, email?: string) {
  try {
    // Get user to fetch email if not provided
    const user = email ? null : await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    const userEmail = email || user?.email

    // Fetch bookings by userId
    const bookingsByUserId = await prisma.booking.findMany({
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

    // Also fetch bookings by email (pre-account bookings) - match by email (case-insensitive)
    let bookingsByEmail: typeof bookingsByUserId = []
    if (userEmail) {
      const normalizedEmail = userEmail.toLowerCase().trim()
      // Fetch all unlinked bookings and filter by email case-insensitively
      const allUnlinkedBookings = await prisma.booking.findMany({
        where: {
          customerEmail: {
            not: null,
          },
          userId: null, // Only get unlinked bookings
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
      
      // Filter by email case-insensitively
      bookingsByEmail = allUnlinkedBookings.filter(booking => 
        booking.customerEmail?.toLowerCase().trim() === normalizedEmail
      )
    }

    // Merge and deduplicate by booking ID
    const bookingMap = new Map<string, typeof bookingsByUserId[0]>()
    bookingsByUserId.forEach(booking => bookingMap.set(booking.id, booking))
    bookingsByEmail.forEach(booking => {
      if (!bookingMap.has(booking.id)) {
        bookingMap.set(booking.id, booking)
      }
    })

    const allBookings = Array.from(bookingMap.values()).sort(
      (a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
    )

    return { success: true, bookings: allBookings }
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

export async function updateCustomerProfile(data: {
  userId: string
  name?: string
  phone?: string
}) {
  try {
    const updateData: { name?: string | null; phone?: string | null } = {}
    if (data.name !== undefined) updateData.name = data.name || null
    
    // Only update phone if the field exists in the schema
    try {
      if (data.phone !== undefined) {
        updateData.phone = data.phone || null
      }
      await prisma.user.update({
        where: { id: data.userId },
        data: updateData,
      })
    } catch (error: any) {
      // If phone field doesn't exist, update without it
      if (error?.message?.includes('phone')) {
        await prisma.user.update({
          where: { id: data.userId },
          data: { name: updateData.name },
        })
      } else {
        throw error
      }
    }

    revalidatePath('/customer/profile')
    revalidatePath('/customer/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating customer profile:', error)
    return { error: 'Failed to update profile' }
  }
}
