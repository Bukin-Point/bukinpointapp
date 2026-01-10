import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { StaffList } from '@/components/provider/staff-list'

export default async function StaffPage() {
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
    where: { providerId: provider.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const services = await prisma.service.findMany({
    where: { providerId: provider.id, isActive: true },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-h1 mb-2">Staff Members</h1>
        <p className="text-body-sm text-text-secondary">
          Manage your team members and their service assignments
        </p>
      </div>
      <StaffList staff={staff} services={services} providerId={provider.id} />
    </div>
  )
}
