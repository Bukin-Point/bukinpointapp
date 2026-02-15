'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProviderContext } from '@/store/provider-context'
import { sanitizeProviderId } from '@/lib/auth-utils'

interface ProviderSelectorProps {
  userId: string
}

export function ProviderSelector({ userId }: ProviderSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    selectedProviderId,
    availableProviders,
    isLoading,
    error,
    setSelectedProvider,
    loadProviders,
    syncWithUrl,
  } = useProviderContext()

  // Load providers on mount
  useEffect(() => {
    loadProviders(userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Sync with URL parameter after providers are loaded
  useEffect(() => {
    if (!isLoading && availableProviders.length > 0) {
      const urlProviderId = searchParams.get('providerId')
      if (urlProviderId) {
        const sanitized = sanitizeProviderId(urlProviderId)
        if (sanitized) {
          syncWithUrl(sanitized)
        }
      }
    }
  }, [searchParams, syncWithUrl, isLoading, availableProviders.length])

  // Don't show selector if only one provider or loading
  if (isLoading || availableProviders.length <= 1) {
    return null
  }

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId)
    
    // Update URL parameter without navigation
    const params = new URLSearchParams(searchParams.toString())
    params.set('providerId', providerId)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const selectedProvider = availableProviders.find((p) => p.id === selectedProviderId)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedProviderId || undefined}
        onValueChange={handleProviderChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select provider">
            {selectedProvider ? selectedProvider.businessName : 'Select provider'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableProviders.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              <div className="flex flex-col">
                <span>{provider.businessName}</span>
                {provider.role && (
                  <span className="text-xs text-muted-foreground">
                    {provider.role === 'OWNER' ? 'Owner' : 'Staff'}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  )
}
