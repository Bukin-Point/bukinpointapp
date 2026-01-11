'use server'

import { prisma } from '@/lib/db'

export interface MarketplaceService {
  id: string
  name: string
  description: string | null
  duration: number
  price: number
  provider: {
    id: string
    businessName: string
    industry: string
    subdomain: string | null
  }
}

export interface MarketplaceProvider {
  id: string
  businessName: string
  industry: string
  subdomain: string | null
  services: Array<{
    id: string
    name: string
    description: string | null
    duration: number
    price: number
  }>
}

/**
 * Get all active providers with their active services for the marketplace
 */
export async function getMarketplaceServices(): Promise<MarketplaceProvider[]> {
  try {
    const providers = await prisma.provider.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        services: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Convert Decimal to number for serialization
    return providers.map((provider) => ({
      id: provider.id,
      businessName: provider.businessName,
      industry: provider.industry,
      subdomain: provider.subdomain,
      services: provider.services.map((service) => ({
        ...service,
        price: Number(service.price),
      })),
    }))
  } catch (error) {
    console.error('Error fetching marketplace services:', error)
    return []
  }
}

/**
 * Get all unique industries from active providers
 */
export async function getMarketplaceIndustries(): Promise<string[]> {
  try {
    const industries = await prisma.provider.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        industry: true,
      },
      distinct: ['industry'],
      orderBy: {
        industry: 'asc',
      },
    })

    return industries.map((p) => p.industry)
  } catch (error) {
    console.error('Error fetching marketplace industries:', error)
    return []
  }
}

/**
 * Search services by query string and optional industry filter
 */
export async function searchMarketplaceServices(
  query?: string,
  industry?: string | null
): Promise<MarketplaceService[]> {
  try {
    const searchQuery = query?.trim() || ''

    // Build where clause for provider
    const providerWhere: any = {
      status: 'ACTIVE',
    }

    if (industry) {
      providerWhere.industry = industry
    }

    // Build where clause for services
    const serviceWhere: any = {
      isActive: true,
    }

    // If there's a search query, search in service name and description
    if (searchQuery) {
      serviceWhere.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    // Fetch providers with services
    const providers = await prisma.provider.findMany({
      where: providerWhere,
      include: {
        services: {
          where: serviceWhere,
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // If there's a search query, also filter by provider name/industry
    let filteredProviders = providers
    if (searchQuery) {
      filteredProviders = providers.filter(
        (provider) =>
          provider.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
          provider.services.length > 0 // Keep providers that have matching services
      )
    }

    // Flatten and format results
    return filteredProviders.flatMap((provider) =>
      provider.services.map((service) => ({
        ...service,
        price: Number(service.price),
        provider: {
          id: provider.id,
          businessName: provider.businessName,
          industry: provider.industry,
          subdomain: provider.subdomain,
        },
      }))
    )
  } catch (error) {
    console.error('Error searching marketplace services:', error)
    return []
  }
}
