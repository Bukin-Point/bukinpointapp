'use server'

import { prisma } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { lockSlot, releaseSlot } from '@/lib/redis'
import { getSession } from '@/lib/auth-helpers-clerk'
import {
  sendBookingConfirmationEmail,
  sendProviderBookingNotificationEmail,
} from '@/lib/email'

const createBookingSchema = z.object({
  providerId: z.string(),
  serviceId: z.string(),
  staffId: z.string(),
  userId: z.string().optional(), // Optional: link to customer account
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  customerEmail: z.string().email().optional(),
  bookingDate: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
})

export async function createBooking(data: z.infer<typeof createBookingSchema>) {
  try {
    // Get session to check if user is logged in
    const session = await getSession()
    const userId = session?.user?.id

    const validated = createBookingSchema.parse(data)

    // Use userId from session if not provided in data
    const finalUserId = validated.userId || userId || null

    // Create lock key for the slot
    const lockKey = `slot:${validated.staffId}:${validated.bookingDate.toISOString()}:${
      validated.startTime
    }`

    // Try to acquire lock (5 minute TTL)
    const lockAcquired = await lockSlot(lockKey, 300)

    if (!lockAcquired) {
      return {
        error: 'This time slot is currently being booked by another customer. Please try again.',
      }
    }

    try {
      // Check if slot is available
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          staffId: validated.staffId,
          bookingDate: validated.bookingDate,
          status: {
            notIn: ['CANCELLED'],
          },
          OR: [
            {
              AND: [
                { startTime: { lte: validated.startTime } },
                { endTime: { gt: validated.startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: validated.endTime } },
                { endTime: { gte: validated.endTime } },
              ],
            },
          ],
        },
      })

      if (conflictingBooking) {
        await releaseSlot(lockKey)
        return { error: 'This time slot is no longer available' }
      }

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          providerId: validated.providerId,
          serviceId: validated.serviceId,
          staffId: validated.staffId,
          userId: finalUserId, // Link to customer account if logged in
          customerName: validated.customerName,
          customerPhone: validated.customerPhone,
          customerEmail: validated.customerEmail,
          bookingDate: validated.bookingDate,
          startTime: validated.startTime,
          endTime: validated.endTime,
          notes: validated.notes,
        },
        include: {
          service: true,
          provider: true,
          staff: {
            include: {
              user: true,
            },
          },
        },
      })

      // Send booking confirmation emails (non-blocking)
      const emailPromises: Promise<unknown>[] = []

      // Send customer confirmation email if email is provided
      if (booking.customerEmail) {
        emailPromises.push(
          sendBookingConfirmationEmail({
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            bookingRef: booking.bookingRef,
            serviceName: booking.service.name,
            providerBusinessName: booking.provider.businessName,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            staffName: booking.staff.user.name,
            price: Number(booking.service.price),
            providerPhone: booking.provider.phone || undefined,
          }).catch((error) => {
            console.error('Error sending customer booking confirmation email:', error)
          })
        )
      }

      // Send provider notification email
      if (booking.provider.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        emailPromises.push(
          sendProviderBookingNotificationEmail({
            providerEmail: booking.provider.email,
            providerBusinessName: booking.provider.businessName,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            customerEmail: booking.customerEmail,
            bookingRef: booking.bookingRef,
            serviceName: booking.service.name,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            staffName: booking.staff.user.name,
            price: Number(booking.service.price),
            bookingUrl: `${appUrl}/bookings`,
          }).catch((error) => {
            console.error('Error sending provider booking notification email:', error)
          })
        )
      }

      // Send emails in parallel (don't wait for them to complete)
      if (emailPromises.length > 0) {
        Promise.all(emailPromises).catch((error) => {
          console.error('Error sending booking emails:', error)
        })
      }

      // Keep lock until payment is processed or fails
      // Lock will expire after 5 minutes automatically

      revalidatePath(`/book/${validated.providerId}`)
      return { success: true, booking, lockKey }
    } catch (error) {
      // Release lock on error
      await releaseSlot(lockKey)
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error creating booking:', error)
    return { error: 'Failed to create booking' }
  }
}

export async function getAvailableSlots(data: {
  providerId: string
  serviceId: string
  date: string
}) {
  try {
    const date = new Date(data.date)
    const dayOfWeek = date.getDay()

    // Get staff who can provide this service
    const staff = await prisma.staffMember.findMany({
      where: {
        providerId: data.providerId,
        isActive: true,
        services: {
          some: {
            serviceId: data.serviceId,
          },
        },
      },
      include: {
        availability: {
          where: {
            dayOfWeek,
            isBlocked: false,
          },
        },
        bookings: {
          where: {
            bookingDate: date,
            status: {
              notIn: ['CANCELLED'],
            },
          },
        },
      },
    })

    // Generate time slots (15-minute intervals)
    const slots: Array<{ time: string; staff: any }> = []
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
    })

    if (!service) {
      return { slots: [] }
    }

    staff.forEach(member => {
      member.availability.forEach(av => {
        const [startHour, startMin] = av.startTime.split(':').map(Number)
        const [endHour, endMin] = av.endTime.split(':').map(Number)
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin

        for (let minutes = startMinutes; minutes + service.duration <= endMinutes; minutes += 15) {
          const slotHour = Math.floor(minutes / 60)
          const slotMin = minutes % 60
          const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMin
            .toString()
            .padStart(2, '0')}`

          // Check if slot conflicts with existing bookings
          const slotEndMinutes = minutes + service.duration
          const slotEndTime = `${Math.floor(slotEndMinutes / 60)
            .toString()
            .padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`

          const hasConflict = member.bookings.some(booking => {
            return (
              (timeString >= booking.startTime && timeString < booking.endTime) ||
              (slotEndTime > booking.startTime && slotEndTime <= booking.endTime) ||
              (timeString <= booking.startTime && slotEndTime >= booking.endTime)
            )
          })

          if (!hasConflict) {
            slots.push({
              time: timeString,
              staff: member,
            })
          }
        }
      })
    })

    return { slots }
  } catch (error) {
    console.error('Error getting available slots:', error)
    return { slots: [] }
  }
}
