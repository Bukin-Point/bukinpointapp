'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/use-debounce'
import { ServiceCard } from './service-card'
import { SearchBar } from './search-bar'
import { FilterBar } from './filter-bar'
import { searchMarketplaceServices, type MarketplaceService } from '@/actions/marketplace'
import type { MarketplaceProvider } from '@/actions/marketplace'

interface ServiceMarketplaceProps {
  initialProviders: MarketplaceProvider[]
  industries: string[]
}

export function ServiceMarketplace({ initialProviders, industries }: ServiceMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Flatten initial services for initial render
  const initialServices = useMemo(
    () =>
      initialProviders.flatMap((provider) =>
        provider.services.map((service) => ({
          ...service,
          provider: {
            id: provider.id,
            businessName: provider.businessName,
            industry: provider.industry,
            subdomain: provider.subdomain,
          },
        }))
      ),
    [initialProviders]
  )

  // Determine if we should search (has query or industry filter)
  const hasSearchQuery = debouncedSearchQuery.trim().length > 0
  const hasIndustryFilter = selectedIndustry !== null
  const shouldSearch = hasSearchQuery || hasIndustryFilter

  // Use TanStack Query for search with caching
  const {
    data: searchResults,
    isLoading: loading,
  } = useQuery({
    queryKey: ['marketplace-search', debouncedSearchQuery.trim() || null, selectedIndustry],
    queryFn: () => searchMarketplaceServices(debouncedSearchQuery.trim() || undefined, selectedIndustry || undefined),
    enabled: shouldSearch, // Only run query if there's a search term or industry filter
    placeholderData: (previousData) => previousData ?? initialServices, // Show previous or initial data while loading
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })

  // Use search results if available and we're searching, otherwise use initial services
  const filteredServices = shouldSearch ? (searchResults ?? initialServices) : initialServices

  return (
    <div className="space-y-6">
      {/* Hero Section with Search */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-h1 font-bold">Find Services Near You</h1>
          <p className="text-body-lg text-text-secondary max-w-2xl mx-auto">
            Discover and book services from trusted providers in your area
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
      </div>

      {/* Filter Bar */}
      {industries.length > 0 && (
        <div>
          <FilterBar
            industries={industries}
            selectedIndustry={selectedIndustry}
            onIndustryChange={setSelectedIndustry}
          />
        </div>
      )}

      {/* Results Count */}
      <div className="text-body-sm text-text-secondary">
        {loading ? (
          <p>Searching...</p>
        ) : filteredServices.length === 0 ? (
          <p>No services found. Try adjusting your search or filters.</p>
        ) : (
          <p>
            {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'} found
          </p>
        )}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-body-lg text-text-secondary">Searching services...</p>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard key={`${service.provider.id}-${service.id}`} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-body-lg text-text-secondary">No services match your criteria</p>
        </div>
      )}
    </div>
  )
}
