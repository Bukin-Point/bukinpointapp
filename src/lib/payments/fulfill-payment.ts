import { prisma } from '@/lib/db'
import { sendBookingConfirmationEmail, sendProviderBookingNotificationEmail } from '@/lib/email'
import { PaymentGateway } from '@prisma/client'
import { calculateServiceCharge } from './fees'

/**
 * Idempotent: mark booking as paid, create transaction, update wallet, send emails.
 * Used by OPay and Paystack webhook handlers.
 */
export async function fulfillPaymentSuccess(params: {
  reference: string
  transactionId: string | undefined
  gatewayName: PaymentGateway
}): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { bookingRef: params.reference },
    include: { service: true, provider: true, userProvider: { include: { user: true } } },
  })

  if (!booking || booking.paymentStatus === 'PAID') return

  const existingTx = await prisma.transaction.findUnique({
    where: { bookingId: booking.id },
  })
  if (existingTx) return

  const servicePrice = Number(booking.service.price)
  const { fee: platformFee, total: totalPaid } = await calculateServiceCharge(servicePrice)
  const netAmount = servicePrice

  console.log(`[fulfillPaymentSuccess] Starting transaction for booking ${booking.id}. netAmount: ${netAmount}`)

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({
        where: { bookingId: booking.id },
      })
      if (existing) {
        console.log(`[fulfillPaymentSuccess] Transaction already exists for booking ${booking.id}`)
        return
      }

      console.log(`[fulfillPaymentSuccess] Updating booking ${booking.bookingRef} to CONFIRMED/PAID`)
      await tx.booking.update({
        where: { bookingRef: params.reference },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentRef: params.transactionId ?? null,
        },
      })

      console.log(`[fulfillPaymentSuccess] Creating transaction record for booking ${booking.id}`)
      await tx.transaction.create({
        data: {
          bookingId: booking.id,
          amount: totalPaid,
          platformFee,
          netAmount,
          paymentProvider: params.gatewayName,
          providerRef: params.transactionId ?? null,
          status: 'PAID',
        },
      })

      console.log(`[fulfillPaymentSuccess] Updating wallet for provider ${booking.providerId}. Incrementing by ${netAmount}`)
      await tx.wallet.update({
        where: { providerId: booking.providerId },
        data: {
          balance: { increment: netAmount },
          totalEarnings: { increment: netAmount },
        },
      })
      console.log(`[fulfillPaymentSuccess] Wallet update successful`)
    })
    console.log(`[fulfillPaymentSuccess] Transaction committed successfully for booking ${booking.id}`)
  } catch (error) {
    console.error(`[fulfillPaymentSuccess] Transaction failed for booking ${booking.id}:`, error)
    throw error // Re-throw to allow webhook to handle failure
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (booking.customerEmail) {
    sendBookingConfirmationEmail({
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      bookingRef: booking.bookingRef,
      serviceName: booking.service.name,
      providerBusinessName: booking.provider.businessName,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      staffName: booking.userProvider.user.name ?? '',
      price: Number(booking.service.price),
      providerPhone: booking.provider.phone || undefined,
    }).catch((e) => console.error('fulfillPaymentSuccess: sendBookingConfirmationEmail error', e))
  }

  if (booking.provider.email) {
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
      staffName: booking.userProvider.user.name ?? '',
      price: Number(booking.service.price),
      bookingUrl: `${appUrl}/bookings`,
    }).catch((e) => console.error('fulfillPaymentSuccess: sendProviderBookingNotificationEmail error', e))
  }

  // Clear cache for the provider's views so new balances and books show up immediately
  const { revalidatePath } = await import('next/cache')
  revalidatePath('/bookings')
  revalidatePath('/wallet')
  revalidatePath('/dashboard')
}
