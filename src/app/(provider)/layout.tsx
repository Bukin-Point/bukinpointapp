import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { ProviderNav } from '@/components/provider/provider-nav'

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Get provider for navigation
  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
    select: { businessName: true },
  })

  // If no provider exists, render children without navigation
  // This allows the onboarding page to render
  // The onboarding page itself will handle redirects if needed
  if (!provider) {
    return <>{children}</>
  }

  // If provider exists, render with navigation sidebar
  return (
    <div className="flex min-h-screen">
      <ProviderNav businessName={provider.businessName} />
      <main className="flex-1 pt-16 lg:pt-0 lg:ml-64">
        <div className="mx-auto px-4 py-4 lg:py-8 lg:container">{children}</div>
      </main>
    </div>
  )
}
