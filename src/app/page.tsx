import { headers } from 'next/headers'
import { ServiceMarketplace } from '@/components/marketplace/service-marketplace'
import { HomeHeader } from '@/components/marketplace/home-header'
import { LandingHero } from '@/components/marketplace/landing-hero'
import { Footer } from '@/components/marketplace/footer'
import { getMarketplaceServices, getMarketplaceIndustries } from '@/actions/marketplace'
import { prisma } from '@/lib/db'
import { ProviderLanding } from '@/components/booking/provider-landing'
import { resolveRequestTenant } from '@/lib/request-tenant'

export const metadata = {
  title: 'BukinPoint - Book Services Online',
  description: 'Discover and book services from trusted providers in your area',
}

export default async function HomePage() {
  const headersList = await headers()
  const tenant = await resolveRequestTenant()
  const providerIdFromHeader = tenant.providerId

  // If we have a subdomain or provider ID from middleware, check if it's a valid provider
  let provider = null
  if (tenant.subdomain || providerIdFromHeader) {
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
      } else if (tenant.subdomain) {
        // Look up provider by subdomain
        provider = await prisma.provider.findUnique({
          where: { subdomain: tenant.subdomain },
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
      console.error('[HomePage] Error resolving tenant homepage:', {
        error,
        host: headersList.get('x-forwarded-host') || headersList.get('host'),
        subdomain: tenant.subdomain,
      })
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
