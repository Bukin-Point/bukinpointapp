'use server'

import { prisma } from '@/lib/db'
import { StaffRole } from '@prisma/client'

export interface ProviderOption {
  id: string
  businessName: string
  role?: StaffRole
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

    // Check if user is a provider
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
      })
    }

    // Get all staff memberships
    const staffMembers = await prisma.staffMember.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    })

    // Add providers from staff memberships (only active providers)
    for (const staffMember of staffMembers) {
      if (staffMember.provider.status === 'ACTIVE') {
        // Avoid duplicates (in case user is both provider and staff for same provider)
        if (!providers.some((p) => p.id === staffMember.provider.id)) {
          providers.push({
            id: staffMember.provider.id,
            businessName: staffMember.provider.businessName,
            role: staffMember.role,
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
