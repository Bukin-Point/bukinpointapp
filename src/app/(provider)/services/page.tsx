import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { ServiceList } from '@/components/provider/service-list'

export default async function ServicesPage() {
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

  const services = await prisma.service.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-h1 mb-2">Services</h1>
          <p className="text-body-sm text-text-secondary">
            Manage your service offerings
          </p>
        </div>
      </div>
      <ServiceList services={services} providerId={provider.id} />
    </div>
  )
}
