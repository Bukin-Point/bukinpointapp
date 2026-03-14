import React from 'react'
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
    let isOnSubdomain = !!subdomain;
    if (!isOnSubdomain && hostHeader) {
      const hwp = hostHeader.split(':')[0]
      if (hwp.endsWith('.vercel.app')) {
        const parts = hwp.replace('.vercel.app', '').split('.')
        isOnSubdomain = parts.length >= 2
      } else {
        isOnSubdomain = hwp.split('.').length >= 3 &&
          !hwp.startsWith('localhost') &&
          !hwp.startsWith('127.0.0.1') &&
          !['bukinpoint.test', 'bukinpoint.localhost', 'bukinpoint.com'].includes(hwp)
      }
    }

    if (isOnSubdomain) {
      // On subdomain without session - redirect to main domain signin
      const mainDomainSigninUrl = `${getAppUrl()}/signin`


      redirect(mainDomainSigninUrl)
    } else {
      // On main domain without session - normal redirect
      redirect('/signin')
    }
  }


  // FALLBACK: If headers are missing but we're on a subdomain, extract from hostname
  let finalSubdomainProviderId = subdomainProviderId
  let finalSubdomain = subdomain

  if (!finalSubdomainProviderId && hostHeader) {
    // Extract subdomain from hostname as fallback
    const hostWithoutPort = hostHeader.split(':')[0] // Remove port

    let extractedSubdomain: string | null = null
    if (hostWithoutPort !== 'localhost' && hostWithoutPort !== '127.0.0.1') {
      if (hostWithoutPort.endsWith('.vercel.app')) {
        const baseName = hostWithoutPort.replace('.vercel.app', '')
        const parts = baseName.split('.')
        if (parts.length >= 2) {
          extractedSubdomain = parts[0].toLowerCase()
        } else {
          extractedSubdomain = null
        }
      } else {
        const parts = hostWithoutPort.split('.')
        if (hostWithoutPort.endsWith('.localhost') && parts.length >= 2) {
          extractedSubdomain = parts[0].toLowerCase()
        } else if (hostWithoutPort.endsWith('.test') && parts.length >= 3) {
          extractedSubdomain = parts[0].toLowerCase()
        } else if (parts.length >= 3) {
          extractedSubdomain = parts[0].toLowerCase()
        }
      }
    }


    if (extractedSubdomain && extractedSubdomain !== 'www' && extractedSubdomain !== 'app' && extractedSubdomain !== 'api' && extractedSubdomain !== 'admin') {
      // Look up provider by subdomain
      const { prisma } = await import('@/lib/db')
      const provider = await prisma.provider.findUnique({
        where: { subdomain: extractedSubdomain },
        select: { id: true, status: true },
      })

      if (provider && provider.status === 'ACTIVE') {
        finalSubdomain = extractedSubdomain
        finalSubdomainProviderId = provider.id
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
