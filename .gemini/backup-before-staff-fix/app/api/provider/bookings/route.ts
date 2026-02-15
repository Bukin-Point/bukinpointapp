'use server'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getFilteredBookings } from '@/actions/bookings'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const headers = request.headers

  const providerIdHeader = headers.get('x-provider-id') || undefined
  const providerId = providerIdHeader || searchParams.get('providerId') || undefined

  const dateFilter = searchParams.get('dateFilter') || undefined
  const dateFrom = searchParams.get('dateFrom') || undefined
  const dateTo = searchParams.get('dateTo') || undefined
  const staffId = searchParams.get('staffId') || undefined
  const serviceId = searchParams.get('serviceId') || undefined
  const status = searchParams.get('status') || undefined

  const result = await getFilteredBookings({
    userId: session.user.id,
    providerId,
    dateFilter,
    dateFrom,
    dateTo,
    staffId,
    serviceId,
    status,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ bookings: result.bookings })
}

