'use server'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getFilteredBookings } from '@/actions/bookings'
import { extractTenantSubdomain, normalizeHostname } from '@/lib/tenant-host'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const headers = request.headers

  const host = normalizeHostname(headers.get('x-forwarded-host') || headers.get('host'))
  const subdomain = headers.get('x-subdomain') || extractTenantSubdomain(host)
  let providerIdHeader = headers.get('x-provider-id') || undefined

  if (!providerIdHeader && subdomain) {
    const provider = await prisma.provider.findUnique({
      where: { subdomain },
      select: { id: true, status: true },
    })
    providerIdHeader = provider?.status === 'ACTIVE' ? provider.id : undefined
  }

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

