import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { prisma } from '@/lib/db'
import { CustomerNav } from '@/components/customer/customer-nav'

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Check if user is a provider or staff - if so, redirect to appropriate dashboard
  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
  })

  if (provider) {
    redirect('/dashboard')
  }

  const staffMember = await prisma.staffMember.findFirst({
    where: { userId: session.user.id },
  })

  if (staffMember) {
    redirect('/dashboard')
  }

  // Get user info for navigation
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })

  return (
    <div className="flex min-h-screen">
      <CustomerNav userName={user?.name || user?.email || 'Customer'} />
      <main className="flex-1 pb-16 pt-16 lg:ml-64 lg:pb-0 lg:pt-0">
        <div className="mx-auto px-4 py-8 lg:container">{children}</div>
      </main>
    </div>
  )
}
