import { prisma } from '@/lib/db'
import { sendBookingConfirmationEmail, sendProviderBookingNotificationEmail } from '@/lib/email'
import { PaymentGateway } from '@prisma/client'

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
    include: { service: true, provider: true, staff: { include: { user: true } } },
  })

  if (!booking || booking.paymentStatus === 'PAID') return

  const existingTx = await prisma.transaction.findUnique({
    where: { bookingId: booking.id },
  })
  if (existingTx) return

  const servicePrice = Number(booking.service.price)
  const platformFeePercentage = Number(process.env.PLATFORM_FEE_PERCENTAGE || 10)
  const platformFee = Math.min(servicePrice * (platformFeePercentage / 100), 1000)
  const totalPaid = servicePrice + platformFee
  const netAmount = servicePrice

  await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findUnique({
      where: { bookingId: booking.id },
    })
    if (existing) return

    await tx.booking.update({
      where: { bookingRef: params.reference },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentRef: params.transactionId ?? null,
      },
    })

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

    await tx.wallet.update({
      where: { providerId: booking.providerId },
      data: {
        balance: { increment: netAmount },
        totalEarnings: { increment: netAmount },
      },
    })
  })

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
      staffName: booking.staff.user.name ?? '',
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
      staffName: booking.staff.user.name ?? '',
      price: Number(booking.service.price),
      bookingUrl: `${appUrl}/bookings`,
    }).catch((e) => console.error('fulfillPaymentSuccess: sendProviderBookingNotificationEmail error', e))
  }
}
