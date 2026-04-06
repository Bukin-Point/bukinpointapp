import React from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { ProviderLayoutClient } from '@/components/provider/provider-layout-client'
import { getAppUrl, getSubdomainUrl } from '@/lib/url'
import { resolveRequestTenant } from '@/lib/request-tenant'
import { isTenantSubdomain } from '@/lib/tenant-host'

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // SECURITY: If accessing a subdomain, verify user has access to it
  const headersList = await headers()
  const hostHeader = headersList.get('host') || ''
  const tenant = await resolveRequestTenant()

  // If no session, redirect to main domain signin (never redirect to subdomain signin)
  if (!session) {
    const isOnSubdomain = !!tenant.subdomain || isTenantSubdomain(hostHeader)

    if (isOnSubdomain) {
      // On subdomain without session - redirect to main domain signin
      const mainDomainSigninUrl = `${getAppUrl()}/signin`


      redirect(mainDomainSigninUrl)
    } else {
      // On main domain without session - normal redirect
      redirect('/signin')
    }
  }


  const finalSubdomainProviderId = tenant.providerId
  const finalSubdomain = tenant.subdomain

  // Variables mostly handled by new url helpers now

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id)

  if (accessContext) {
    // User IS a provider. strictly enforce they are on their correct subdomain
    const providerSubdomain = accessContext.provider.subdomain

    // If they have a subdomain assigned, and they are NOT currently on it:
    if (providerSubdomain && finalSubdomain !== providerSubdomain) {
      const subdomainDashboardUrl = getSubdomainUrl(providerSubdomain, '/dashboard')


      redirect(subdomainDashboardUrl)
    }

    // They are correctly on their own subdomain! Render the dashboard layout.
    return (
      <React.Suspense fallback={<div>Loading provider details...</div>}>
        <ProviderLayoutClient
          businessName={accessContext.provider.businessName}
          accessContext={accessContext}
          userId={session.user.id}
        >
          {children}
        </ProviderLayoutClient>
      </React.Suspense>
    )
  }

  // User IS NOT a provider (no access context).
  // If they are trying to access any provider subdomain, block them and route them to main domain.
  if (finalSubdomainProviderId || finalSubdomain) {
    const mainDomainUrl = `${getAppUrl()}/dashboard` // This will hit customer dashboard logic naturally


    redirect(mainDomainUrl)
  }

  // If no provider access exists and they are safely on the main domain, render children without navigation
  // This allows the onboarding page to render natively
  return <>{children}</>
}
