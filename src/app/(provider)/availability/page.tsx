import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess, canManageStaff, isStaff } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { AvailabilityManager } from '@/components/provider/availability-manager'

export default async function AvailabilityPage() {
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
  const canManage = canManageStaff(accessContext)
  const userIsStaff = isStaff(accessContext)

  // If staff (not OWNER), only show their own availability
  const staffWhere: any = { providerId, isActive: true }

  if (userIsStaff && !canManage) {
    // STAFF role can only see their own availability
    const staffMember = await prisma.staffMember.findFirst({
      where: {
        providerId,
        userId: session.user.id,
      },
    })

    if (staffMember) {
      staffWhere.id = staffMember.id
    } else {
      redirect('/dashboard')
    }
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { timezone: true },
  })

  if (!provider) {
    redirect('/onboarding')
  }

  const staff = await prisma.staffMember.findMany({
    where: staffWhere,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      availability: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-h1 mb-2">Availability</h1>
        <p className="text-body-sm text-text-secondary">
          {canManage
            ? 'Set working hours and availability for your staff members'
            : 'Set your working hours and availability'}
        </p>
      </div>
      <AvailabilityManager
        staff={staff}
        providerId={providerId}
        timezone={provider.timezone}
        canManage={canManage}
      />
    </div>
  )
}
