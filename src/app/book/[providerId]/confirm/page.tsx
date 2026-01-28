import { Suspense } from 'react'
import { BookingConfirmation } from '@/components/booking/booking-confirmation'

export default function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingConfirmationWrapper searchParams={searchParams} />
    </Suspense>
  )
}

async function BookingConfirmationWrapper({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams

  if (!ref) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-h1 mb-4">Invalid Booking Reference</h1>
          <p className="text-body">The booking reference is missing or invalid.</p>
        </div>
      </div>
    )
  }

  return <BookingConfirmationContent bookingRef={ref} />
}

async function BookingConfirmationContent({ bookingRef }: { bookingRef: string }) {
  const { prisma } = await import('@/lib/db')
  const { getSession } = await import('@/lib/auth-helpers-clerk')

  const session = await getSession()

  const booking = await prisma.booking.findUnique({
    where: { bookingRef },
    include: {
      service: true,
      provider: {
        select: {
          businessName: true,
        },
      },
      staff: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-h1 mb-4">Booking Not Found</h1>
          <p className="text-body">The booking reference could not be found.</p>
        </div>
      </div>
    )
  }

  // Serialize Decimal fields to numbers for client component
  const serializedBooking = {
    ...booking,
    service: {
      ...booking.service,
      price: Number(booking.service.price),
    },
  }

  return <BookingConfirmation booking={serializedBooking} session={session} />
}
