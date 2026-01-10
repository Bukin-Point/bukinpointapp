'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { redis, lockSlot, releaseSlot } from '@/lib/redis'
import { z } from 'zod'

const processPaymentSchema = z.object({
  bookingId: z.string(),
})

export async function processPayment(data: z.infer<typeof processPaymentSchema>) {
  try {
    const validated = processPaymentSchema.parse(data)

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: validated.bookingId },
      include: {
        service: true,
        provider: true,
      },
    })

    if (!booking) {
      return { error: 'Booking not found' }
    }

    if (booking.paymentStatus === 'PAID') {
      return { error: 'Booking is already paid' }
    }

    // Create lock key
    const lockKey = `booking:${validated.bookingId}:payment`

    // Try to acquire lock
    const lockAcquired = await lockSlot(lockKey, 300) // 5 minutes

    if (!lockAcquired) {
      return { error: 'Payment is already being processed' }
    }

    try {
      // Simulate payment processing
      // In production, this would integrate with a payment gateway
      const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '10')
      const amount = Number(booking.service.price)
      const platformFee = (amount * platformFeePercentage) / 100
      const netAmount = amount - platformFee

      // Create transaction
      const transaction = await prisma.$transaction(async (tx) => {
        // Update booking payment status
        const updatedBooking = await tx.booking.update({
          where: { id: validated.bookingId },
          data: {
            paymentStatus: 'PAID',
            paymentRef: `PAY-${Date.now()}`,
          },
        })

        // Create transaction record
        const newTransaction = await tx.transaction.create({
          data: {
            bookingId: validated.bookingId,
            amount,
            platformFee,
            netAmount,
            paymentProvider: 'SIMULATED',
            providerRef: `PROV-${Date.now()}`,
            status: 'PAID',
          },
        })

        // Update wallet
        await tx.wallet.update({
          where: { providerId: booking.providerId },
          data: {
            balance: {
              increment: netAmount,
            },
            totalEarnings: {
              increment: netAmount,
            },
          },
        })

        return { booking: updatedBooking, transaction: newTransaction }
      })

      // Release lock
      await releaseSlot(lockKey)

      revalidatePath('/bookings')
      revalidatePath('/wallet')

      return { success: true, transaction: transaction.transaction }
    } catch (error) {
      // Release lock on error
      await releaseSlot(lockKey)
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error processing payment:', error)
    return { error: 'Failed to process payment' }
  }
}

export async function simulatePaymentFailure(bookingId: string) {
  try {
    const lockKey = `booking:${bookingId}:payment`
    await releaseSlot(lockKey)

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: 'FAILED',
      },
    })

    revalidatePath('/bookings')
    return { success: true }
  } catch (error) {
    console.error('Error simulating payment failure:', error)
    return { error: 'Failed to update payment status' }
  }
}
