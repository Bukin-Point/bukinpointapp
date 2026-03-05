import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { ProviderLayoutClient } from '@/components/provider/provider-layout-client'
import { getAppUrl, getSubdomainUrl } from '@/lib/url'

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
      const mainDomainSigninUrl = `${getAppUrl()}/signin`

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

  // Variables mostly handled by new url helpers now

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id)

  if (accessContext) {
    // User IS a provider. strictly enforce they are on their correct subdomain
    const providerSubdomain = accessContext.provider.subdomain

    // If they have a subdomain assigned, and they are NOT currently on it:
    if (providerSubdomain && finalSubdomain !== providerSubdomain) {
      const subdomainDashboardUrl = getSubdomainUrl(providerSubdomain, '/dashboard')

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:109', message: 'Routing provider strictly to their subdomain', data: { userId: session.user.id, currentSubdomain: finalSubdomain, correctSubdomain: providerSubdomain, redirectingTo: subdomainDashboardUrl }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      redirect(subdomainDashboardUrl)
    }

    // They are correctly on their own subdomain! Render the dashboard layout.
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

  // User IS NOT a provider (no access context).
  // If they are trying to access any provider subdomain, block them and route them to main domain.
  if (finalSubdomainProviderId || finalSubdomain) {
    const mainDomainUrl = `${getAppUrl()}/dashboard` // This will hit customer dashboard logic naturally

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'layout.tsx:130', message: 'SECURITY: Unauthorized subdomain access - redirecting to main domain', data: { userId: session.user.id, subdomain: finalSubdomain, mainDomainUrl }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    redirect(mainDomainUrl)
  }

  // If no provider access exists and they are safely on the main domain, render children without navigation
  // This allows the onboarding page to render natively
  return <>{children}</>
}
