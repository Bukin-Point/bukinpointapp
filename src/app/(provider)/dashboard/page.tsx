import { getSession } from '@/lib/auth-helpers-clerk'
import { redirect } from 'next/navigation'
import { getProviderAccess, canViewAllBookings, canManageStaff, isStaff } from '@/lib/staff-helpers'
import { getDashboardStats } from '@/actions/dashboard'
import { StatsCard } from '@/components/provider/stats-card'
import { RecentBookings } from '@/components/provider/recent-bookings'
import { UpcomingAppointments } from '@/components/provider/upcoming-appointments'
import { Calendar, DollarSign, Briefcase, Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id)

  if (!accessContext) {
    redirect('/onboarding')
  }

  const providerId = accessContext.provider.id
  const canViewAll = canViewAllBookings(accessContext)
  const canManage = canManageStaff(accessContext)
  const userIsStaff = isStaff(accessContext)

  // Fetch dashboard stats (will filter by staff if needed)
  const dashboardData = await getDashboardStats(
    providerId,
    canViewAll ? undefined : session.user.id
  )

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

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-h1 mb-2">Dashboard</h1>
        <p className="text-body-sm text-text-secondary">
          Welcome back{userIsStaff ? '' : `, ${accessContext.provider.businessName}`}! Here's what's
          happening with your business.
        </p>
      </div>

      {/* Quick Actions */}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="flex-1 sm:flex-none">
            <Link href="/services">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Service</span>
              <span className="sm:hidden">Service</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
            <Link href="/staff">
              <Users className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Staff</span>
              <span className="sm:hidden">Staff</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
            <Link href="/availability">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Set Availability</span>
              <span className="sm:hidden">Availability</span>
            </Link>
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Bookings"
          value={stats.totalBookings.toLocaleString()}
          icon={Calendar}
        />
        {canManage && (
          <>
            <StatsCard title="Total Revenue" value={formattedRevenue} icon={DollarSign} />
            <StatsCard title="Active Services" value={stats.activeServices} icon={Briefcase} />
            <StatsCard title="Active Staff" value={stats.activeStaff} icon={Users} />
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
