'use server'

import { prisma } from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { lockSlot, releaseSlot, getCachedSlots, setCachedSlots, invalidateSlotCache } from '@/lib/redis'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getPaymentGateway } from '@/lib/payments/gateway-factory'
const createBookingSchema = z.object({
  providerId: z.string(),
  serviceId: z.string(),
  staffId: z.string(),
  userId: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  customerEmail: z.string().email().optional(),
  bookingDate: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
  consentGiven: z.boolean(),
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
      const service = await prisma.service.findUnique({
        where: { id: validated.serviceId },
        select: { price: true, name: true },
      })
      if (!service) return { error: 'Service not found' }
      if (Number(service.price) < 100) {
        return { error: 'Service price must be at least ₦100.' }
      }

      // Prevent booking past times
      const now = new Date()
      const bookingDateTime = new Date(validated.bookingDate)
      const [hours, minutes] = validated.startTime.split(':').map(Number)
      bookingDateTime.setHours(hours, minutes, 0, 0)
      
      // Require booking to be at least 15 minutes in the future
      const minBookingTime = new Date(now.getTime() + 15 * 60 * 1000)
      if (bookingDateTime < minBookingTime) {
        await releaseSlot(lockKey)
        return { error: 'Cannot book appointments in the past. Please select a future time slot.' }
      }

      // Check if slot is available (exclude abandoned PENDING: payment never completed, created >30 min ago)
      const abandonedBefore = new Date(Date.now() - 30 * 60 * 1000)
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          staffId: validated.staffId,
          bookingDate: validated.bookingDate,
          status: { notIn: ['CANCELLED'] },
          // Don't treat as conflict: PENDING + payment PENDING and created >30 min ago (OPay expireAt)
          NOT: {
            AND: [
              { status: 'PENDING' },
              { paymentStatus: 'PENDING' },
              { createdAt: { lt: abandonedBefore } },
            ],
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

      // Create booking (emails sent from OPay webhook on payment success)
      const booking = await prisma.booking.create({
        data: {
          providerId: validated.providerId,
          serviceId: validated.serviceId,
          staffId: validated.staffId,
          userId: finalUserId,
          customerName: validated.customerName,
          customerPhone: validated.customerPhone,
          customerEmail: validated.customerEmail,
          bookingDate: validated.bookingDate,
          startTime: validated.startTime,
          endTime: validated.endTime,
          notes: validated.notes,
          consentGiven: validated.consentGiven,
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

      // Release lock so retries aren't blocked; DB booking is the source of truth for conflicts
      await releaseSlot(lockKey)
      invalidateSlotCache(
        validated.providerId,
        validated.serviceId,
        validated.bookingDate.toISOString().split('T')[0]
      )

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
    const dateStr = date.toISOString().split('T')[0]
    const cacheKey = `slots:${data.providerId}:${data.serviceId}:${dateStr}`
    const cacheTtl = 10 * 60 // 10 minutes

    // Check Redis cache first
    const cachedSlots = await getCachedSlots(cacheKey)
    if (cachedSlots) {
      return { slots: cachedSlots }
    }

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

    // Check if date is today - need to filter out past times
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const selectedDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const isToday = selectedDateOnly.getTime() === today.getTime()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

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

          // Filter out past times if booking for today
          if (isToday) {
            const slotTimeInMinutes = slotHour * 60 + slotMin
            const currentTimeInMinutes = currentHour * 60 + currentMinute
            // Only allow slots that start at least 15 minutes from now
            if (slotTimeInMinutes <= currentTimeInMinutes + 15) {
              continue
            }
          }

          // Check if slot conflicts with existing bookings
          const slotEndMinutes = minutes + service.duration
          const slotEndTime = `${Math.floor(slotEndMinutes / 60)
            .toString()
            .padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`

          // Ignore abandoned PENDING: >30 min, payment never completed (OPay expireAt)
          const hasConflict = member.bookings.some(booking => {
            if (booking.status === 'PENDING' && booking.paymentStatus === 'PENDING') {
              const created = new Date(booking.createdAt).getTime()
              if (Date.now() - created > 30 * 60 * 1000) return false
            }
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

    // Cache the calculated slots
    if (slots.length > 0) {
      await setCachedSlots(cacheKey, slots, cacheTtl)
    }

    return { slots }
  } catch (error) {
    console.error('Error getting available slots:', error)
    return { slots: [] }
  }
}

export async function getAvailableDays(data: {
  providerId: string
  serviceId: string
  daysAhead?: number
}) {
  try {
    const daysAhead = data.daysAhead || 30
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const availableDays: string[] = []

    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
    })

    if (!service) {
      return { availableDays: [] }
    }

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
        availability: true,
      },
    })

    if (staff.length === 0) {
      return { availableDays: [] }
    }

    // Check each day in the range
    for (let i = 0; i < daysAhead; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() + i)
      const dayOfWeek = checkDate.getDay()

      // Check if any staff has availability for this day
      let hasAvailableSlot = false

      for (const member of staff) {
        // Check availability for this day of week
        const dayAvailability = member.availability.filter(
          av => av.dayOfWeek === dayOfWeek && !av.isBlocked
        )

        if (dayAvailability.length === 0) continue

            // Check existing bookings for this date
            const existingBookings = await prisma.booking.findMany({
              where: {
                staffId: member.id,
                bookingDate: checkDate,
                status: {
                  notIn: ['CANCELLED'],
                },
              },
            })

        // Generate potential slots and check if any are available
        for (const av of dayAvailability) {
          const [startHour, startMin] = av.startTime.split(':').map(Number)
          const [endHour, endMin] = av.endTime.split(':').map(Number)
          const startMinutes = startHour * 60 + startMin
          const endMinutes = endHour * 60 + endMin

          // Check slots in 15-minute intervals
          for (let minutes = startMinutes; minutes + service.duration <= endMinutes; minutes += 15) {
            const slotHour = Math.floor(minutes / 60)
            const slotMin = minutes % 60
            const timeString = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`

            const slotEndMinutes = minutes + service.duration
            const slotEndTime = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`

            // Check if slot conflicts with existing bookings (ignore abandoned PENDING: >30 min, payment never completed)
            const hasConflict = existingBookings.some(booking => {
              if (booking.status === 'PENDING' && booking.paymentStatus === 'PENDING') {
                const created = new Date(booking.createdAt).getTime()
                if (Date.now() - created > 30 * 60 * 1000) return false
              }
              return (
                (timeString >= booking.startTime && timeString < booking.endTime) ||
                (slotEndTime > booking.startTime && slotEndTime <= booking.endTime) ||
                (timeString <= booking.startTime && slotEndTime >= booking.endTime)
              )
            })

            if (!hasConflict) {
              hasAvailableSlot = true
              break
            }
          }

          if (hasAvailableSlot) break
        }

        if (hasAvailableSlot) break
      }

      if (hasAvailableSlot) {
        availableDays.push(checkDate.toISOString().split('T')[0])
      }
    }

    return { availableDays }
  } catch (error) {
    console.error('Error getting available days:', error)
    return { availableDays: [] }
  }
}

export async function getBookingByRef(bookingRef: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      service: true,
      provider: { select: { businessName: true } },
      staff: { include: { user: { select: { name: true } } } },
    },
  })
  if (!booking) return { error: 'Booking not found' }
  return {
    booking: {
      ...booking,
      service: { ...booking.service, price: Number(booking.service.price) },
    },
  }
}

/**
 * Initialize payment for a booking using the DB-configured gateway (OPay or Paystack).
 * Returns the URL to redirect the customer to the gateway's checkout page.
 */
export async function initiateBookingPayment(bookingRef: string) {
  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: { service: true, provider: true, staff: { include: { user: true } } },
  })
  if (!booking) return { error: 'Booking not found' }
  if (booking.paymentStatus === 'PAID') return { error: 'Booking is already paid.' }
  if (Number(booking.service.price) < 100) return { error: 'Service price must be at least ₦100.' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const date = booking.bookingDate.toISOString().split('T')[0]
  const time = `${booking.startTime}–${booking.endTime}`

  const servicePrice = Number(booking.service.price)
  const platformFeePercentage = Number(process.env.PLATFORM_FEE_PERCENTAGE || 10)
  const platformFee = Math.min(servicePrice * (platformFeePercentage / 100), 1000)
  const totalAmountKobo = Math.round((servicePrice + platformFee) * 100)

  const gateway = await getPaymentGateway(booking.providerId)
  const callbackPath = gateway.name === 'PAYSTACK' ? '/api/webhooks/paystack' : '/api/webhooks/opay'

  const result = await gateway.initializePayment({
    bookingId: booking.id,
    reference: booking.bookingRef,
    amountKobo: totalAmountKobo,
    currency: 'NGN',
    customerEmail: booking.customerEmail ?? booking.customerName,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    callbackUrl: `${baseUrl}${callbackPath}`,
    returnUrl: `${baseUrl}/book/${booking.providerId}/confirm?ref=${booking.bookingRef}`,
    cancelUrl: `${baseUrl}/book/${booking.providerId}?payment=cancelled`,
    productName: booking.service.name,
    productDescription: `Booking: ${booking.service.name} - ${date} ${time}`,
  })

  if ('error' in result) return { error: result.error }
  return { success: true, cashierUrl: result.redirectUrl }
}

/** @deprecated Use initiateBookingPayment. Kept for backward compatibility. */
export async function initiateOPayCashierPayment(bookingRef: string) {
  return initiateBookingPayment(bookingRef)
}
