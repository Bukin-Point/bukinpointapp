import { auth } from '@clerk/nextjs/server'
import { prisma } from './db'
import type { AccessContext } from './staff-helpers-client'

// Full permission set for direct provider owners
const PROVIDER_FULL_PERMISSIONS = [
  'view:dashboard',
  'manage:settings',
  'booking:read',
  'booking:create',
  'booking:update',
  'booking:delete',
  'service:read',
  'service:write',
  'manage:users',
  'manage:roles',
  'wallet:read',
  'wallet:payout'
]

// Re-export types and client-safe utilities from client file
export type { UserProviderContext, ProviderContext, AccessContext } from './staff-helpers-client'

export {
  canAccessRoute,
  canManageStaff,
  canEditServices,
  canViewAllBookings,
  canViewWallet,
  canManageRoles,
  getProviderId,
  isStaff,
  getStaffRole,
  hasPermission,
} from './staff-helpers-client'

/**
 * Validate that a user has access to a specific provider
 */
export async function validateProviderAccess(
  userId: string,
  providerId: string
): Promise<boolean> {
  // Import here to avoid circular dependency
  const { validateProviderAccess: validate } = await import('./provider-context-guards')
  return validate(userId, providerId)
}

/**
 * Get provider access context for a user (either as provider or staff)
 * If providerId is provided, validates access to that specific provider
 * If not provided, returns first available provider (backward compatibility)
 */
export async function getProviderAccess(
  userId: string,
  providerId?: string
): Promise<AccessContext | null> {
  let tokenPermissions: Record<string, string[]> = {}
  try {
    const { sessionClaims } = await auth()
    tokenPermissions = (sessionClaims?.metadata as any)?.permissions || {}
  } catch (err) {
    console.error('[getProviderAccess] auth() failed, using empty permissions:', err)
  }

  // If providerId is specified, validate access and return that specific provider
  if (providerId) {
    // Check if user is the provider owner
    const provider = await prisma.provider.findFirst({
      where: {
        id: providerId,
        userId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        businessName: true,
        industry: true,
        userId: true,
        businessImage: true,
        subdomain: true,
      },
    })

    if (provider) {
      return {
        provider,
        permissions: tokenPermissions[providerId] || PROVIDER_FULL_PERMISSIONS
      }
    }

    // Check if user has UserProvider relationship to this provider
    const userProvider = await prisma.userProvider.findFirst({
      where: {
        providerId,
        userId,
        isActive: true,
      },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            industry: true,
            userId: true,
            status: true,
            businessImage: true,
            subdomain: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    if (userProvider && userProvider.provider.status === 'ACTIVE') {
      return {
        userProvider: {
          id: userProvider.id,
          providerId: userProvider.providerId,
          userId: userProvider.userId,
          isOwner: userProvider.isOwner,
          roles: userProvider.roles,
          permissions: userProvider.permissions,
        },
        provider: {
          id: userProvider.provider.id,
          businessName: userProvider.provider.businessName,
          userId: userProvider.provider.userId,
          industry: userProvider.provider.industry,
          businessImage: userProvider.provider.businessImage,
          subdomain: userProvider.provider.subdomain,
        },
        permissions: tokenPermissions[providerId] || []
      }
    }

    return null
  }

  // Backward compatibility: return first available provider
  // First check if user is a provider
  const provider = await prisma.provider.findFirst({
    where: { userId, status: 'ACTIVE' },
    select: {
      id: true,
      businessName: true,
      userId: true,
      industry: true,
      businessImage: true,
      subdomain: true,
    },
  })

  if (provider) {
    return {
      provider,
      permissions: tokenPermissions[provider.id] || PROVIDER_FULL_PERMISSIONS
    }
  }

  // If not provider, check if user has UserProvider relationship
  const userProvider = await prisma.userProvider.findFirst({
    where: { userId, isActive: true },
    include: {
      provider: {
        select: {
          id: true,
          businessName: true,
          industry: true,
          userId: true,
          businessImage: true,
          status: true,
          subdomain: true,
        },
      },
      roles: {
        include: {
          role: true,
        },
      },
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  })

  if (userProvider && userProvider.provider?.status === 'ACTIVE') {
    return {
      userProvider: {
        id: userProvider.id,
        providerId: userProvider.providerId,
        userId: userProvider.userId,
        isOwner: userProvider.isOwner,
        roles: userProvider.roles,
        permissions: userProvider.permissions,
      },
      provider: {
        id: userProvider.provider.id,
        businessName: userProvider.provider.businessName,
        industry: userProvider.provider.industry,
        userId: userProvider.provider.userId,
        businessImage: userProvider.provider.businessImage,
        subdomain: userProvider.provider.subdomain,
      },
      permissions: tokenPermissions[userProvider.providerId] || []
    }
  }

  return null
}
