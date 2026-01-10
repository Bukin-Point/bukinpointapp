import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { AvailabilityManager } from '@/components/provider/availability-manager'

export default async function AvailabilityPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
  })

  if (!provider) {
    redirect('/onboarding')
  }

  const staff = await prisma.staffMember.findMany({
    where: { providerId: provider.id, isActive: true },
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
          Set working hours and availability for your staff members
        </p>
      </div>
      <AvailabilityManager staff={staff} providerId={provider.id} timezone={provider.timezone} />
    </div>
  )
}
