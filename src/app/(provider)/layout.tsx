import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { ProviderNav } from '@/components/provider/provider-nav'
import { headers } from 'next/headers'

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // Providers and staff work on root domain only - no subdomain logic needed
  if (!session) {
    redirect('/signin')
  }

  // Get provider access using simple user-based access control
  // Each user can only be associated with one provider (either as owner or staff)
  const accessContext = await getProviderAccess(session.user.id)

  // If no provider access exists, render children without navigation
  // This allows the onboarding page to render
  // The onboarding page itself will handle redirects if needed
  // Individual pages (like dashboard) will check and redirect to onboarding if needed
  if (!accessContext) {
    return <>{children}</>
  }

  // If provider access exists, render with navigation sidebar
  return (
    <div className="flex min-h-screen">
      <ProviderNav
        businessName={accessContext.provider.businessName}
        accessContext={accessContext}
        userId={session.user.id}
      />
      <main className="flex-1 pt-16 lg:pt-0 lg:ml-64">
        <div className="mx-auto px-4 py-4 lg:py-8 lg:container">{children}</div>
      </main>
    </div>
  )
}
