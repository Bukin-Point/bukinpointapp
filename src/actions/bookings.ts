'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import {
  sendBookingStatusUpdateEmail,
  sendBookingConfirmationEmail,
  sendProviderBookingNotificationEmail,
  sendRescheduleNotificationEmail,
} from '@/lib/email'
import { canViewAllBookings, getProviderAccess } from '@/lib/staff-helpers'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { processPayment } from '@/actions/payments'

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

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    })

    if (status === 'COMPLETED') {
      processPayment({ bookingId }).catch((e) => console.error('updateBookingStatus: processPayment error', e))
    }

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

const filteredBookingsSchema = z.object({
  userId: z.string(),
  providerId: z.string().optional(),
  dateFilter: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  staffId: z.string().optional(),
  serviceId: z.string().optional(),
  status: z.string().optional(),
})

export async function getFilteredBookings(params: z.infer<typeof filteredBookingsSchema>) {
  const validated = filteredBookingsSchema.parse(params)

  // Get access context
  const accessContext = await getProviderAccess(validated.userId, validated.providerId)
  if (!accessContext) {
    return { error: 'You do not have access to this provider' }
  }

  const providerId = accessContext.provider.id
  const canViewAll = canViewAllBookings(accessContext)

  const bookingWhere: any = { providerId }

  // Staff visibility
  if (!canViewAll && 'staffMember' in accessContext) {
    bookingWhere.staffId = accessContext.staffMember.id
  } else if (validated.staffId) {
    bookingWhere.staffId = validated.staffId
  }

  // Service filter
  if (validated.serviceId) {
    bookingWhere.serviceId = validated.serviceId
  }

  // Status filter
  if (validated.status && validated.status !== 'all') {
    bookingWhere.status = validated.status
  }

  // Date filter
  if (validated.dateFilter || validated.dateFrom || validated.dateTo) {
    const now = new Date()
    let dateStart: Date | undefined
    let dateEnd: Date | undefined

    switch (validated.dateFilter) {
      case 'today':
        dateStart = startOfDay(now)
        dateEnd = endOfDay(now)
        break
      case 'thisWeek':
        dateStart = startOfWeek(now, { weekStartsOn: 1 })
        dateEnd = endOfWeek(now, { weekStartsOn: 1 })
        break
      case 'thisMonth':
        dateStart = startOfMonth(now)
        dateEnd = endOfMonth(now)
        break
      default:
        dateStart = validated.dateFrom ? startOfDay(new Date(validated.dateFrom)) : undefined
        dateEnd = validated.dateTo ? endOfDay(new Date(validated.dateTo)) : undefined
        break
    }

    if (dateStart || dateEnd) {
      bookingWhere.bookingDate = {}
      if (dateStart) bookingWhere.bookingDate.gte = dateStart
      if (dateEnd) bookingWhere.bookingDate.lte = dateEnd
    }
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      service: {
        select: {
          id: true,
          name: true,
          price: true,
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
    orderBy: { bookingDate: 'desc' },
  })

  return { success: true, bookings }
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

const createManualBookingSchema = z.object({
  providerId: z.string(),
  serviceId: z.string(),
  staffId: z.string(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  bookingDate: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional().or(z.literal('')),
  overrideAvailability: z.boolean().default(false),
})

export async function createManualBooking(data: z.infer<typeof createManualBookingSchema>) {
  try {
    const validated = createManualBookingSchema.parse(data)

    // Check if staff can provide this service
    const staffService = await prisma.staffService.findFirst({
      where: {
        staffId: validated.staffId,
        serviceId: validated.serviceId,
      },
    })

    if (!staffService && !validated.overrideAvailability) {
      return { error: 'Selected staff member cannot provide this service' }
    }

    // Check for conflicts only if not in override mode
    if (!validated.overrideAvailability) {
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
            {
              AND: [
                { startTime: { gte: validated.startTime } },
                { endTime: { lte: validated.endTime } },
              ],
            },
          ],
        },
      })

      if (conflictingBooking) {
        return { error: 'This time slot conflicts with an existing booking' }
      }
    }

    // Try to link to existing customer account by email
    let userId: string | null = null
    if (validated.customerEmail) {
      const user = await prisma.user.findUnique({
        where: { email: validated.customerEmail },
        select: { id: true },
      })
      if (user) {
        userId = user.id
      }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        providerId: validated.providerId,
        serviceId: validated.serviceId,
        staffId: validated.staffId,
        userId,
        customerName: validated.customerName,
        customerPhone: validated.customerPhone,
        customerEmail: validated.customerEmail || null,
        bookingDate: validated.bookingDate,
        startTime: validated.startTime,
        endTime: validated.endTime,
        notes: validated.notes || null,
        status: 'CONFIRMED', // Manual bookings are auto-confirmed
        consentGiven: true, // Assumed for manual bookings
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

    // Send confirmation emails (non-blocking)
    const emailPromises: Promise<unknown>[] = []

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
          staffName: booking.staff.user.name || booking.staff.user.email,
          price: Number(booking.service.price),
          providerPhone: booking.provider.phone || undefined,
        }).catch((error) => {
          console.error('Error sending customer booking confirmation email:', error)
        })
      )
    }

    if (booking.provider.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      emailPromises.push(
        sendProviderBookingNotificationEmail({
          providerEmail: booking.provider.email,
          providerBusinessName: booking.provider.businessName,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          customerEmail: booking.customerEmail || null,
          bookingRef: booking.bookingRef,
          serviceName: booking.service.name,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          staffName: booking.staff.user.name || booking.staff.user.email,
          price: Number(booking.service.price),
          bookingUrl: `${appUrl}/bookings`,
        }).catch((error) => {
          console.error('Error sending provider booking notification email:', error)
        })
      )
    }

    if (emailPromises.length > 0) {
      Promise.all(emailPromises).catch((error) => {
        console.error('Error sending booking emails:', error)
      })
    }

    revalidatePath('/bookings')
    return { success: true, booking }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error creating manual booking:', error)
    return { error: 'Failed to create booking' }
  }
}

export async function cancelBooking(bookingId: string, initiatedBy: 'customer' | 'provider' = 'provider') {
  try {
    // Get booking details before cancelling
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { select: { id: true, name: true, price: true } },
        provider: { select: { id: true, businessName: true, email: true, phone: true } },
        staff: { include: { user: { select: { name: true } } } },
      },
    })

    if (!booking) {
      return { error: 'Booking not found' }
    }

    if (booking.status === 'CANCELLED') {
      return { error: 'Booking is already cancelled' }
    }

    // Update booking status to CANCELLED
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    })

    // Send cancellation emails based on who initiated
    const emailPromises: Promise<unknown>[] = []

    if (initiatedBy === 'customer') {
      // Customer cancelled - notify provider
      if (booking.provider.email) {
        emailPromises.push(
          sendBookingStatusUpdateEmail({
            customerEmail: booking.provider.email,
            customerName: booking.provider.businessName,
            bookingRef: booking.bookingRef,
            serviceName: booking.service.name,
            providerBusinessName: booking.provider.businessName,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            newStatus: 'CANCELLED',
            previousStatus: booking.status,
          }).catch(error => {
            console.error('Error sending provider cancellation notification:', error)
          })
        )
      }
    } else {
      // Provider cancelled - notify customer
      if (booking.customerEmail) {
        emailPromises.push(
          sendBookingStatusUpdateEmail({
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            bookingRef: booking.bookingRef,
            serviceName: booking.service.name,
            providerBusinessName: booking.provider.businessName,
            bookingDate: booking.bookingDate,
            startTime: booking.startTime,
            endTime: booking.endTime,
            newStatus: 'CANCELLED',
            previousStatus: booking.status,
          }).catch(error => {
            console.error('Error sending customer cancellation email:', error)
          })
        )
      }
    }

    if (emailPromises.length > 0) {
      Promise.all(emailPromises).catch(error => {
        console.error('Error sending cancellation emails:', error)
      })
    }

    revalidatePath('/bookings')
    revalidatePath('/customer/bookings')
    return { success: true }
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return { error: 'Failed to cancel booking' }
  }
}

const rescheduleBookingSchema = z.object({
  bookingId: z.string(),
  newDate: z.date(),
  newStartTime: z.string(),
  newEndTime: z.string(),
  initiatedBy: z.enum(['customer', 'provider']).optional().default('provider'),
})

export async function rescheduleBooking(data: z.infer<typeof rescheduleBookingSchema>) {
  try {
    const validated = rescheduleBookingSchema.parse(data)

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: validated.bookingId },
      include: {
        service: { select: { id: true, name: true, duration: true, price: true } },
        provider: { select: { id: true, businessName: true, email: true, phone: true } },
        staff: { 
          include: { 
            user: { select: { name: true } },
            availability: true,
          } 
        },
      },
    })

    if (!booking) {
      return { error: 'Booking not found' }
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      return { error: `Cannot reschedule a ${booking.status.toLowerCase()} booking` }
    }

    // Check if new date is in the past
    const now = new Date()
    const newBookingDateTime = new Date(validated.newDate)
    const [hours, minutes] = validated.newStartTime.split(':').map(Number)
    newBookingDateTime.setHours(hours, minutes, 0, 0)

    if (newBookingDateTime < now) {
      return { error: 'Cannot reschedule to a past date/time' }
    }

    // Check if new slot conflicts with existing bookings (excluding current booking)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        staffId: booking.staffId,
        bookingDate: validated.newDate,
        id: { not: validated.bookingId },
        status: {
          notIn: ['CANCELLED'],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: validated.newStartTime } },
              { endTime: { gt: validated.newStartTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: validated.newEndTime } },
              { endTime: { gte: validated.newEndTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: validated.newStartTime } },
              { endTime: { lte: validated.newEndTime } },
            ],
          },
        ],
      },
    })

    if (conflictingBooking) {
      return { error: 'The selected time slot conflicts with an existing booking' }
    }

    // Update booking (maintain status, don't change to CONFIRMED)
    const updatedBooking = await prisma.booking.update({
      where: { id: validated.bookingId },
      data: {
        bookingDate: validated.newDate,
        startTime: validated.newStartTime,
        endTime: validated.newEndTime,
        // Maintain current status - don't auto-confirm on reschedule
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

    // Send reschedule notification email based on who initiated
    const emailPromises: Promise<unknown>[] = []

    if (validated.initiatedBy === 'customer') {
      // Customer rescheduled - notify provider
      if (booking.provider.email) {
        emailPromises.push(
          sendRescheduleNotificationEmail({
            initiatedBy: 'customer',
            recipientEmail: booking.provider.email,
            recipientName: booking.provider.businessName,
            bookingRef: booking.bookingRef,
            serviceName: booking.service.name,
            providerBusinessName: booking.provider.businessName,
            customerName: booking.customerName,
            oldDate: booking.bookingDate,
            oldStartTime: booking.startTime,
            oldEndTime: booking.endTime,
            newDate: validated.newDate,
            newStartTime: validated.newStartTime,
            newEndTime: validated.newEndTime,
            providerPhone: booking.provider.phone || undefined,
          }).catch(error => {
            console.error('Error sending provider reschedule notification:', error)
          })
        )
      }
    } else {
      // Provider rescheduled - notify customer
      if (booking.customerEmail) {
        emailPromises.push(
          sendRescheduleNotificationEmail({
            initiatedBy: 'provider',
            recipientEmail: booking.customerEmail,
            recipientName: booking.customerName,
            bookingRef: booking.bookingRef,
            serviceName: booking.service.name,
            providerBusinessName: booking.provider.businessName,
            customerName: booking.customerName,
            oldDate: booking.bookingDate,
            oldStartTime: booking.startTime,
            oldEndTime: booking.endTime,
            newDate: validated.newDate,
            newStartTime: validated.newStartTime,
            newEndTime: validated.newEndTime,
            providerPhone: booking.provider.phone || undefined,
          }).catch(error => {
            console.error('Error sending customer reschedule notification:', error)
          })
        )
      }
    }

    if (emailPromises.length > 0) {
      Promise.all(emailPromises).catch(error => {
        console.error('Error sending reschedule notification emails:', error)
      })
    }

    // Invalidate slot cache for both old and new dates
    const { invalidateSlotCache } = await import('@/lib/redis')
    const oldDateStr = booking.bookingDate.toISOString().split('T')[0]
    const newDateStr = validated.newDate.toISOString().split('T')[0]
    await invalidateSlotCache(booking.provider.id, booking.service.id, oldDateStr)
    if (oldDateStr !== newDateStr) {
      await invalidateSlotCache(booking.provider.id, booking.service.id, newDateStr)
    }

    revalidatePath('/bookings')
    revalidatePath('/customer/bookings')
    return { success: true, booking: updatedBooking }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error rescheduling booking:', error)
    return { error: 'Failed to reschedule booking' }
  }
}
