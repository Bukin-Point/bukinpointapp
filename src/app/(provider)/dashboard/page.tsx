import { getSession } from '@/lib/auth-helpers-clerk'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getProviderAccess, canViewAllBookings, canManageStaff, isStaff, canViewWallet } from '@/lib/staff-helpers'
import { getDashboardStats } from '@/actions/dashboard'
import { StatsCard } from '@/components/provider/stats-card'
import { RecentBookings } from '@/components/provider/recent-bookings'
import { UpcomingAppointments } from '@/components/provider/upcoming-appointments'
import { Calendar, DollarSign, Briefcase, Users } from 'lucide-react'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'
import { QuickActionLinks } from '@/components/provider/quick-action-links'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ providerId?: string }>
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
  const canManage = canManageStaff(accessContext)
  const canViewRevenue = canViewWallet(accessContext)
  const userIsStaff = isStaff(accessContext)

  // Fetch dashboard stats (will filter by staff if needed)
  const dashboardData = await getDashboardStats(providerId, canViewAll ? undefined : session.user.id)

  if (!dashboardData.success) {
    // Handle error state - for now just show empty state
    return (
      <div>
        <h1 className="text-h1 mb-4">Dashboard</h1>
        <p className="text-body">Error loading dashboard data. Please try again.</p>
      </div>
    )
  }

  const { stats, recentBookings, upcomingAppointments } = dashboardData

  // Format revenue
  const formattedRevenue = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(stats.totalRevenue)

  const formattedPending = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(stats.pendingBalance)

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h1 mb-2">Dashboard</h1>
        <p className="text-body-sm text-text-secondary">
          Welcome back{userIsStaff ? '' : `, ${accessContext.provider.businessName} `}! Here's what's happening with your business.
        </p>
      </div>

      {/* Quick Actions */}
      {canManage && (
        <QuickActionLinks providerId={providerId} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title="Total Bookings"
          value={stats.totalBookings.toLocaleString()}
          icon={Calendar}
        />
        {canViewRevenue && (
          <>
            <StatsCard
              title="Available Revenue"
              value={formattedRevenue}
              icon={DollarSign}
            />
            <StatsCard
              title="Pending Revenue"
              value={formattedPending}
              icon={DollarSign}
            />
          </>
        )}
        {canManage && (
          <>
            <StatsCard
              title="Active Services"
              value={stats.activeServices}
              icon={Briefcase}
            />
            <StatsCard
              title="Active Staff"
              value={stats.activeStaff}
              icon={Users}
            />
          </>
        )}
      </div>

      {/* Recent Bookings and Upcoming Appointments */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <RecentBookings bookings={recentBookings} />
        <UpcomingAppointments appointments={upcomingAppointments} />
      </div>
    </div>
  )
}
