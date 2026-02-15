import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canViewAllBookings } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { BookingList } from '@/components/provider/booking-list'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    providerId?: string
    dateFilter?: string
    dateFrom?: string
    dateTo?: string
    staffId?: string
    serviceId?: string
  }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // SECURITY: If on a subdomain, use the subdomain's provider ID (enforced by layout)
  const headersList = await headers()
  const subdomainProviderId = headersList.get('x-provider-id')

  const params = await searchParams
  // Prioritize subdomain provider ID over URL parameter for security
  const urlProviderId = subdomainProviderId || (params.providerId ? sanitizeProviderId(params.providerId) : undefined)

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id, urlProviderId || undefined)

  if (!accessContext) {
    if (urlProviderId) {
      return (
        <ProviderContextError
          userId={session.user.id}
          errorMessage="You don't have access to this provider or the provider doesn't exist."
        />
      )
    }
    redirect('/onboarding')
  }

  const providerId = accessContext.provider.id
  const canViewAll = canViewAllBookings(accessContext)

  const { dateFilter, dateFrom, dateTo, staffId, serviceId } = params

  // Build booking where clause
  const bookingWhere: any = { providerId }

  // If staff, filter to only their bookings
  if (!canViewAll && 'userProvider' in accessContext) {
    bookingWhere.userProviderId = accessContext.userProvider.id
  }

  // Apply date filter
  if (dateFilter || dateFrom || dateTo) {
    const now = new Date()
    let dateStart: Date | undefined
    let dateEnd: Date | undefined

    if (dateFilter === 'today') {
      dateStart = startOfDay(now)
      dateEnd = endOfDay(now)
    } else if (dateFilter === 'thisWeek') {
      dateStart = startOfWeek(now, { weekStartsOn: 1 })
      dateEnd = endOfWeek(now, { weekStartsOn: 1 })
    } else if (dateFilter === 'thisMonth') {
      dateStart = startOfMonth(now)
      dateEnd = endOfMonth(now)
    } else if (dateFrom || dateTo) {
      dateStart = dateFrom ? startOfDay(new Date(dateFrom)) : undefined
      dateEnd = dateTo ? endOfDay(new Date(dateTo)) : undefined
    }

    if (dateStart || dateEnd) {
      if (!bookingWhere.bookingDate) bookingWhere.bookingDate = {}
      if (dateStart) bookingWhere.bookingDate.gte = dateStart
      if (dateEnd) bookingWhere.bookingDate.lte = dateEnd
    }
  }

  // Apply staff filter
  if (staffId && canViewAll) {
    bookingWhere.userProviderId = staffId
  }

  // Apply service filter
  if (serviceId) {
    bookingWhere.serviceId = serviceId
  }

  // Fetch bookings with filters
  const bookingsRaw = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      service: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
      userProvider: {
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

  // Serialize bookings: convert Decimal price to number for client
  const bookings = bookingsRaw.map((b) => ({
    ...b,
    service: { ...b.service, price: Number(b.service.price) },
  }))

  // Fetch staff (userProviders) and services for filter dropdowns
  const staff = canViewAll
    ? await prisma.userProvider.findMany({
      where: { providerId, isActive: true },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    : []

  const services = await prisma.service.findMany({
    where: { providerId },
    select: {
      id: true,
      name: true,
      duration: true,
      price: true,
    },
    orderBy: { name: 'asc' },
  })

  // Serialize services to convert Decimal price to number
  const serializedServices = services.map((service) => ({
    ...service,
    price: Number(service.price),
  }))

  // Serialize staff (userProviders) for client component
  const serializedUserProviders = staff.map((s) => ({
    ...s,
    user: s.user,
  }))

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-h1 mb-2">Bookings</h1>
        <p className="text-body-sm text-text-secondary">
          View and manage customer bookings
        </p>
      </div>
      <BookingList
        bookings={bookings}
        providerId={providerId}
        userProviders={serializedUserProviders}
        services={serializedServices}
        initialFilters={{
          dateFilter: dateFilter || 'all',
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          staffId: staffId || undefined,
          serviceId: serviceId || undefined,
        }}
      />
    </div>
  )
}
