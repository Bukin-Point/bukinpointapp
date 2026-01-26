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

    // Idempotent: if Transaction already exists, return success
    const existing = await prisma.transaction.findUnique({
      where: { bookingId: validated.bookingId },
    })
    if (existing) {
      return { success: true, transaction: existing }
    }

    const lockKey = `booking:${validated.bookingId}:payment`
    const lockAcquired = await lockSlot(lockKey, 300)
    if (!lockAcquired) {
      return { error: 'Payment is already being processed' }
    }

    try {
      const amount = Number(booking.service.price)
      const platformFee = 100
      const netAmount = amount >= 100 ? amount - 100 : 0
      const fee = amount < 100 ? amount : 100

      const transaction = await prisma.$transaction(async (tx) => {
        if (booking.paymentStatus !== 'PAID') {
          await tx.booking.update({
            where: { id: validated.bookingId },
            data: { paymentStatus: 'PAID', paymentRef: `PAY-${Date.now()}` },
          })
        }

        const newTransaction = await tx.transaction.create({
          data: {
            bookingId: validated.bookingId,
            amount,
            platformFee: fee,
            netAmount,
            paymentProvider: 'OPAY',
            providerRef: booking.paymentRef ?? null,
            status: 'PAID',
          },
        })

        await tx.wallet.update({
          where: { providerId: booking.providerId },
          data: {
            balance: { increment: netAmount },
            totalEarnings: { increment: netAmount },
          },
        })

        return { transaction: newTransaction }
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
      return { error: error.issues[0]?.message || 'Validation error' }
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
