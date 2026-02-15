'use client'

import { create } from 'zustand'
export interface ProviderOption {
  id: string
  businessName: string
  role?: 'OWNER' | 'STAFF' | 'PROVIDER'
  isProvider: boolean
}

interface ProviderContextState {
  selectedProviderId: string | null
  availableProviders: ProviderOption[]
  isLoading: boolean
  error: string | null
  // Actions
  setSelectedProvider: (providerId: string) => void
  loadProviders: (userId: string) => Promise<void>
  clearContext: () => void
  syncWithUrl: (providerId: string | null) => void
  syncWithLocalStorage: () => boolean
  persistToLocalStorage: (providerId: string) => void
}

const STORAGE_KEY = 'bukinpoint_selected_provider_id'

export const useProviderContext = create<ProviderContextState>((set, get) => ({
  selectedProviderId: null,
  availableProviders: [],
  isLoading: false,
  error: null,

  setSelectedProvider: (providerId: string) => {
    // Validate providerId exists in available providers
    const { availableProviders } = get()
    const isValid = availableProviders.some((p) => p.id === providerId)

    if (!isValid) {
      set({ error: 'Invalid provider selected' })
      return
    }

    set({ selectedProviderId: providerId, error: null })
    get().persistToLocalStorage(providerId)
  },

  loadProviders: async (userId: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch(`/api/provider-context?userId=${userId}`)
      const data = await response.json()

      if (!data.success) {
        set({ error: data.error || 'Failed to load providers', isLoading: false })
        return
      }

      const providers = data.providers || []
      set({ availableProviders: providers, isLoading: false, error: null })

      // Auto-select if only one provider
      if (providers.length === 1) {
        get().setSelectedProvider(providers[0].id)
      } else if (providers.length > 1) {
        // Try to restore from localStorage or URL
        const stored = get().syncWithLocalStorage()
        if (stored === false) {
          // Set first provider as default
          get().setSelectedProvider(providers[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading providers:', error)
      set({ error: 'Failed to load providers', isLoading: false })
    }
  },

  clearContext: () => {
    set({
      selectedProviderId: null,
      availableProviders: [],
      isLoading: false,
      error: null,
    })
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  },

  syncWithUrl: (providerId: string | null) => {
    if (providerId) {
      // Validate against available providers
      const { availableProviders } = get()
      const isValid = availableProviders.some((p) => p.id === providerId)

      if (isValid) {
        set({ selectedProviderId: providerId, error: null })
        get().persistToLocalStorage(providerId)
      } else {
        set({ error: 'Invalid provider in URL' })
      }
    }
  },

  syncWithLocalStorage: () => {
    if (typeof window === 'undefined') return false

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { availableProviders } = get()
        const isValid = availableProviders.some((p) => p.id === stored)

        if (isValid) {
          set({ selectedProviderId: stored, error: null })
          return true
        } else {
          // Invalid stored value, clear it
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Error syncing with localStorage:', error)
    }

    return false
  },

  persistToLocalStorage: (providerId: string) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, providerId)
    } catch (error) {
      console.error('Error persisting to localStorage:', error)
    }
  },
}))
