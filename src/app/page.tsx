import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ServiceMarketplace } from '@/components/marketplace/service-marketplace'
import { HomeHeader } from '@/components/marketplace/home-header'
import { LandingHero } from '@/components/marketplace/landing-hero'
import { Footer } from '@/components/marketplace/footer'
import { getMarketplaceServices, getMarketplaceIndustries } from '@/actions/marketplace'
import { prisma } from '@/lib/db'
import { ProviderLanding } from '@/components/booking/provider-landing'
import { getSession } from '@/lib/auth-helpers-clerk'

export const metadata = {
  title: 'BukinPoint - Book Services Online',
  description: 'Discover and book services from trusted providers in your area',
}

function extractSubdomain(hostname: string): string | null {
  // Remove port if present (e.g., "business-one.bukinpoint.test:3000" -> "business-one.bukinpoint.test")
  const hostWithoutPort = hostname.split(':')[0]
  
  // Handle localhost - no subdomain
  if (hostWithoutPort.includes('localhost') || hostWithoutPort.includes('127.0.0.1')) {
    // Check if it's a subdomain localhost (e.g., "business-one.localhost")
    if (hostWithoutPort.includes('.localhost') && hostWithoutPort.split('.').length >= 3) {
      const subdomain = hostWithoutPort.split('.')[0].toLowerCase()
      const mainDomains = ['www', 'app', 'api', 'admin', 'dev', 'stage', 'stagging', 'notifications']
      if (!mainDomains.includes(subdomain)) {
        return subdomain
      }
    }
    return null
  }

  // Following Grok's pattern: Extract subdomain as first part before domain
  // e.g., "business-one.bukinpoint.test" -> "business-one"
  // e.g., "customer1.epsy.com" -> "customer1"
  const parts = hostWithoutPort.split('.')
  
  // Need at least 2 parts (subdomain.domain) or 3+ for subdomain.domain.tld
  if (parts.length < 2) {
    return null
  }

  // Handle .test and .localhost domains for development
  if (hostWithoutPort.includes('.test') || hostWithoutPort.includes('.localhost')) {
    const isTest = parts.includes('test')
    const isLocalhost = parts.includes('localhost')

    if ((isTest || isLocalhost) && parts.length >= 3) {
      // Has subdomain: subdomain.bukinpoint.test
      const subdomain = parts[0].toLowerCase()
      const mainDomains = ['www', 'app', 'api', 'admin', 'dev', 'stage', 'stagging', 'notifications', 'bukinpoint']
      if (mainDomains.includes(subdomain)) {
        return null
      }
      return subdomain
    } else if ((isTest || isLocalhost) && parts.length === 2) {
      // Main domain: bukinpoint.test (no subdomain)
      return null
    }
  }

  // Extract subdomain for production (following Grok's pattern: first part is subdomain)
  const subdomain = parts[0].toLowerCase()
  const mainDomains = ['www', 'app', 'api', 'admin', 'dev', 'stage', 'stagging', 'notifications']
  if (mainDomains.includes(subdomain)) {
    return null
  }
  
  // If we have multiple parts and first part is not a main domain, it's likely a subdomain
  // But we need to distinguish between "bukinpoint.com" (no subdomain) and "subdomain.bukinpoint.com" (has subdomain)
  // If parts.length === 2, it's likely the main domain (e.g., "bukinpoint.com")
  // If parts.length >= 3, first part is likely subdomain (e.g., "business-one.bukinpoint.com")
  if (parts.length >= 3) {
    return subdomain
  }

  return null
}

export default async function HomePage() {
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  const providerIdFromHeader = headersList.get('x-provider-id')
  
  // Extract subdomain from hostname
  const subdomain = extractSubdomain(hostname)

  // If we have a subdomain or provider ID from middleware, check if it's a valid provider
  if (subdomain || providerIdFromHeader) {
    try {
      let provider = null

      if (providerIdFromHeader) {
        // Use provider ID from middleware header
        provider = await prisma.provider.findUnique({
          where: { id: providerIdFromHeader },
          include: {
            services: {
              where: { isActive: true },
            },
            staff: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
                services: {
                  include: {
                    service: true,
                  },
                },
              },
            },
          },
        })
      } else if (subdomain) {
        // Look up provider by subdomain
        provider = await prisma.provider.findUnique({
          where: { subdomain },
          include: {
            services: {
              where: { isActive: true },
            },
            staff: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
                services: {
                  include: {
                    service: true,
                  },
                },
              },
            },
          },
        })
      }

      // If provider exists and is active, show provider landing page
      if (provider && provider.status === 'ACTIVE') {
        const session = await getSession()

        // Serialize Decimal fields to numbers for client component
        const serializedProvider = {
          ...provider,
          services: provider.services.map(service => ({
            ...service,
            price: Number(service.price),
          })),
          staff: provider.staff.map(staff => ({
            ...staff,
            services: staff.services.map(staffService => ({
              ...staffService,
              service: {
                ...staffService.service,
                price: Number(staffService.service.price),
              },
            })),
          })),
        }

        return <ProviderLanding provider={serializedProvider} />
      }
    } catch (error) {
      console.error('Error checking subdomain:', error)
      // Fall through to show marketplace
    }
  }

  // Show marketplace homepage for main domain or invalid subdomains
  const [providers, industries] = await Promise.all([
    getMarketplaceServices(),
    getMarketplaceIndustries(),
  ])

  return (
    <div className="min-h-screen bg-surface">
      <HomeHeader />
      <LandingHero />
      <div id="services" className="container mx-auto px-4 py-8 lg:py-12">
        <ServiceMarketplace initialProviders={providers} industries={industries} />
      </div>
      <Footer />
    </div>
  )
}
