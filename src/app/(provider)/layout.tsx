import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { ProviderLayoutClient } from '@/components/provider/provider-layout-client'

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // SECURITY: If accessing a subdomain, verify user has access to it
  const headersList = await headers()
  const subdomainProviderId = headersList.get('x-provider-id')
  const subdomain = headersList.get('x-subdomain')
  const hostHeader = headersList.get('host') || ''

  // If no session, redirect to main domain signin (never redirect to subdomain signin)
  if (!session) {
    // Check if we're on a subdomain
    const isOnSubdomain = subdomain || (hostHeader && hostHeader.split('.').length >= 3 &&
      !hostHeader.startsWith('localhost') &&
      !hostHeader.startsWith('127.0.0.1') &&
      !['bukinpoint.test', 'bukinpoint.localhost', 'bukinpoint.com'].includes(hostHeader.split(':')[0]))

    if (isOnSubdomain) {
      // On subdomain without session - redirect to main domain signin
      const isLocal = process.env.NODE_ENV === 'development'
      const baseDomain = isLocal ? 'bukinpoint.test' : 'bukinpoint.com'
      const protocol = isLocal ? 'http' : 'https'
      const port = isLocal ? ':3000' : ''
      const mainDomainSigninUrl = `${protocol}://${baseDomain}${port}/signin`

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:14', message: 'No session on subdomain - redirecting to main domain signin', data: { hostHeader, subdomain, mainDomainSigninUrl }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      redirect(mainDomainSigninUrl)
    } else {
      // On main domain without session - normal redirect
      redirect('/signin')
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:19', message: 'Subdomain access check', data: { userId: session.user.id, userEmail: session.user.email, subdomainProviderId, subdomain, hostHeader, hasSubdomainHeaders: !!(subdomainProviderId && subdomain) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion

  // FALLBACK: If headers are missing but we're on a subdomain, extract from hostname
  let finalSubdomainProviderId = subdomainProviderId
  let finalSubdomain = subdomain

  if (!finalSubdomainProviderId && hostHeader) {
    // Extract subdomain from hostname as fallback
    const hostWithoutPort = hostHeader.split(':')[0] // Remove port

    let extractedSubdomain: string | null = null
    if (hostWithoutPort !== 'localhost' && hostWithoutPort !== '127.0.0.1') {
      const parts = hostWithoutPort.split('.')
      if (hostWithoutPort.endsWith('.localhost') && parts.length >= 2) {
        extractedSubdomain = parts[0].toLowerCase()
      } else if (hostWithoutPort.endsWith('.test') && parts.length >= 3) {
        extractedSubdomain = parts[0].toLowerCase()
      } else if (parts.length >= 3) {
        extractedSubdomain = parts[0].toLowerCase()
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:32', message: 'Fallback: Attempting subdomain extraction', data: { hostHeader, hostWithoutPort, extractedSubdomain }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    if (extractedSubdomain && extractedSubdomain !== 'www' && extractedSubdomain !== 'app' && extractedSubdomain !== 'api' && extractedSubdomain !== 'admin') {
      // Look up provider by subdomain
      const { prisma } = await import('@/lib/db')
      const provider = await prisma.provider.findUnique({
        where: { subdomain: extractedSubdomain },
        select: { id: true, status: true },
      })

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:42', message: 'Fallback: Provider lookup result', data: { extractedSubdomain, providerFound: !!provider, providerId: provider?.id, providerStatus: provider?.status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      if (provider && provider.status === 'ACTIVE') {
        finalSubdomain = extractedSubdomain
        finalSubdomainProviderId = provider.id

        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:48', message: 'Fallback: Subdomain extracted successfully', data: { hostHeader, extractedSubdomain, providerId: provider.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
      }
    }
  }

  // If we're on a subdomain, verify the user has access to it
  if (finalSubdomainProviderId && finalSubdomain) {
    const accessContext = await getProviderAccess(session.user.id, finalSubdomainProviderId)

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:50', message: 'Subdomain access check result', data: { userId: session.user.id, subdomainProviderId: finalSubdomainProviderId, subdomain: finalSubdomain, hasAccess: !!accessContext, accessContextProviderId: accessContext?.provider?.id, accessContextBusinessName: accessContext?.provider?.businessName }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    if (!accessContext) {
      // User doesn't have access to this subdomain - redirect to main domain dashboard
      // The main domain will then redirect them to their own subdomain
      const mainDomain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const isLocal = process.env.NODE_ENV === 'development'
      const baseDomain = isLocal ? 'bukinpoint.test' : 'bukinpoint.com'
      const protocol = isLocal ? 'http' : 'https'
      const port = isLocal ? ':3000' : ''
      const mainDomainUrl = `${protocol}://${baseDomain}${port}/dashboard`

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:77', message: 'SECURITY: Unauthorized subdomain access - redirecting to main domain dashboard', data: { userId: session.user.id, userEmail: session.user.email, subdomainProviderId: finalSubdomainProviderId, subdomain: finalSubdomain, mainDomainUrl }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      console.error(
        `SECURITY: User ${session.user.id} attempted to access subdomain ${finalSubdomain} (provider ${finalSubdomainProviderId}) without authorization. Redirecting to main domain dashboard.`
      )

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:94', message: 'About to call redirect()', data: { mainDomainUrl, userId: session.user.id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      redirect(mainDomainUrl)
    }
  }

  // Get provider access (either as provider or staff)
  // Pages will handle providerId from their own searchParams
  const accessContext = await getProviderAccess(session.user.id)

  // If no provider access exists, render children without navigation
  // This allows the onboarding page to render
  // The onboarding page itself will handle redirects if needed
  if (!accessContext) {
    return <>{children}</>
  }

  // If provider access exists, verify if they are on the correct subdomain
  if (!finalSubdomainProviderId || !finalSubdomain) {
    const isLocal = process.env.NODE_ENV === 'development'
    const baseDomain = isLocal ? 'bukinpoint.test' : 'bukinpoint.com'
    const protocol = isLocal ? 'http' : 'https'
    const port = isLocal ? ':3000' : ''

    // They are a provider but not on their subdomain. Redirect them to their subdomain
    const providerSubdomain = accessContext.provider.subdomain
    if (providerSubdomain) {
      const subdomainDashboardUrl = `${protocol}://${providerSubdomain}.${baseDomain}${port}/dashboard`
      redirect(subdomainDashboardUrl)
    }
  }

  // If provider access exists and they are on their subdomain, render with navigation sidebar and header
  return (
    <ProviderLayoutClient
      businessName={accessContext.provider.businessName}
      accessContext={accessContext}
      userId={session.user.id}
    >
      {children}
    </ProviderLayoutClient>
  )
}
