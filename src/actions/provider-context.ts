'use server'

import { prisma } from '@/lib/db'

export interface ProviderOption {
  id: string
  businessName: string
  role?: string
  isProvider: boolean
}

/**
 * Get all providers a user has access to (as provider or staff)
 */
export async function getUserProviders(userId: string): Promise<{
  success: boolean
  providers?: ProviderOption[]
  error?: string
}> {
  try {
    const providers: ProviderOption[] = []

    // Check if user is a provider (owner of a provider account via generic provider relation)
    // Note: In the new system, owners are also in UserProvider, but we might still have the direct relation for backward compat or specific logic.
    // However, the original code checked prisma.provider.findUnique({ where: { userId } }).
    // We should keep this if the schema still supports it (it does).
    const provider = await prisma.provider.findUnique({
      where: { userId },
      select: {
        id: true,
        businessName: true,
        status: true,
      },
    })

    if (provider && provider.status === 'ACTIVE') {
      providers.push({
        id: provider.id,
        businessName: provider.businessName,
        isProvider: true,
        role: 'OWNER', // Owners are implicitly OWNER
      })
    }

    // Get all user provider relationships (staff access)
    // In the new RBAC, being a "provider" (owner) might also be represented here if we migrated them.
    // But the original code treated them separately.
    const userProviders = await prisma.userProvider.findMany({
      where: {
        userId,
        isActive: true,
        // Exclude if they are the provider owner (already added above) to avoid dupes, 
        // OR rely on the duplicate check below.
      },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    // Add providers from staff memberships (only active providers)
    for (const up of userProviders) {
      if (up.provider.status === 'ACTIVE') {
        // Avoid duplicates (in case user is both provider and staff for same provider)
        if (!providers.some((p) => p.id === up.provider.id)) {
          // Determine primary role key
          const roleNames = up.roles.map((r) => r.role.name)
          // Default to the first role, or specific ones if found
          let role = roleNames[0]
          if (roleNames.includes('OWNER')) role = 'OWNER'
          else if (roleNames.includes('MANAGER')) role = 'MANAGER'

          providers.push({
            id: up.provider.id,
            businessName: up.provider.businessName,
            role: role,
            isProvider: false,
          })
        }
      }
    }

    return {
      success: true,
      providers,
    }
  } catch (error) {
    console.error('Error getting user providers:', error)
    return {
      success: false,
      error: 'Failed to fetch providers',
    }
  }
}
