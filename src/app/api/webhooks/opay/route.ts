import { NextResponse } from 'next/server'
import { verifyOPayCallback } from '@/lib/opay'
import { prisma } from '@/lib/db'
import { sendBookingConfirmationEmail, sendProviderBookingNotificationEmail } from '@/lib/email'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { payload, valid } = verifyOPayCallback(body)
  if (!valid || !payload) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (payload.status !== 'SUCCESS' || payload.refunded === true) {
    return NextResponse.json({ ok: true })
  }

  const ref = payload.reference
  if (!ref) return NextResponse.json({ ok: true })

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: { service: true, provider: true, staff: { include: { user: true } } },
  })

  if (!booking || booking.paymentStatus === 'PAID') {
    return NextResponse.json({ ok: true })
  }

  await prisma.booking.update({
    where: { bookingRef: ref },
    data: {
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paymentRef: payload.transactionId ?? null,
    },
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
      staffName: booking.staff.user.name,
      price: Number(booking.service.price),
      providerPhone: booking.provider.phone || undefined,
    }).catch((e) => console.error('OPay webhook: sendBookingConfirmationEmail error', e))
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
      staffName: booking.staff.user.name,
      price: Number(booking.service.price),
      bookingUrl: `${appUrl}/bookings`,
    }).catch((e) => console.error('OPay webhook: sendProviderBookingNotificationEmail error', e))
  }

  return NextResponse.json({ ok: true })
}
