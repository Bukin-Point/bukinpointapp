import { headers } from 'next/headers'
import { ServiceMarketplace } from '@/components/marketplace/service-marketplace'
import { HomeHeader } from '@/components/marketplace/home-header'
import { LandingHero } from '@/components/marketplace/landing-hero'
import { Footer } from '@/components/marketplace/footer'
import { getMarketplaceServices, getMarketplaceIndustries } from '@/actions/marketplace'
import { prisma } from '@/lib/db'
import { ProviderLanding } from '@/components/booking/provider-landing'

export const metadata = {
  title: 'BukinPoint - Book Services Online',
  description: 'Discover and book services from trusted providers in your area',
}

function extractSubdomain(hostname: string): string | null {
  // Remove port if present (e.g., "business-one.bukinpoint.test:3000" -> "business-one.bukinpoint.test")
  const hostWithoutPort = hostname.split(':')[0]

  if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') return null

  let subdomain: string | null = null

  if (hostWithoutPort.endsWith('.vercel.app')) {
    const baseName = hostWithoutPort.replace('.vercel.app', '')
    const parts = baseName.split('.')
    if (parts.length >= 2) {
      subdomain = parts[0].toLowerCase()
    } else {
      subdomain = null
    }
  } else {
    const parts = hostWithoutPort.split('.')
    if (hostWithoutPort.endsWith('.localhost') && parts.length >= 2) {
      subdomain = parts[0].toLowerCase()
    } else if (hostWithoutPort.endsWith('.test') && parts.length >= 3) {
      subdomain = parts[0].toLowerCase()
    } else if (parts.length >= 3) {
      subdomain = parts[0].toLowerCase()
    }
  }

  if (!subdomain) return null

  const mainDomains = [
    'www',
    'app',
    'api',
    'admin',
    'dev',
    'stage',
    'stagging',
    'notifications',
    'bukinpoint',
  ]

  if (mainDomains.includes(subdomain)) {
    return null
  }

  return subdomain
}

export default async function HomePage() {
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  const providerIdFromHeader = headersList.get('x-provider-id')

  // Extract subdomain from hostname
  const subdomain = extractSubdomain(hostname)

  // If we have a subdomain or provider ID from middleware, check if it's a valid provider
  let provider = null
  if (subdomain || providerIdFromHeader) {
    try {
      if (providerIdFromHeader) {
        // Use provider ID from middleware header
        provider = await prisma.provider.findUnique({
          where: { id: providerIdFromHeader },
          include: {
            services: {
              where: { isActive: true },
            },
            userProviders: {
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
            userProviders: {
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
    } catch (error) {
      console.error('Error checking subdomain:', error)
      // Fall through to show marketplace
    }
  }

  // If provider exists and is active, show provider landing page
  if (provider && provider.status === 'ACTIVE') {
    // Serialize Decimal fields to numbers for client component
    const serializedProvider = {
      ...provider,
      services: provider.services.map(service => ({
        ...service,
        price: Number(service.price),
      })),
      userProviders: provider.userProviders.map(staff => ({
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
