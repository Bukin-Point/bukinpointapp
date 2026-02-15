import { prisma } from './db'
import type { AccessContext } from './staff-helpers-client'

// Re-export types and client-safe utilities from client file
export type { UserProviderContext, ProviderContext, AccessContext } from './staff-helpers-client'

export {
  canAccessRoute,
  canManageStaff,
  canEditServices,
  canViewAllBookings,
  getProviderId,
  isStaff,
  getStaffRole,
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
  // If providerId is specified, validate access and return that specific provider
  if (providerId) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'staff-helpers.ts:38', message: 'Checking provider access', data: { userId, providerId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
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
      },
    })

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'staff-helpers.ts:54', message: 'Provider ownership check result', data: { userId, providerId, isOwner: !!provider, providerBusinessName: provider?.businessName }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

    if (provider) {
      return { provider }
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

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'staff-helpers.ts:77', message: 'UserProvider relationship check result', data: { userId, providerId, hasAccess: !!userProvider, roles: userProvider?.roles.map(r => r.role.name), providerStatus: userProvider?.provider?.status }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion

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
        },
      }
    }

    // User doesn't have access to this provider
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'staff-helpers.ts:94', message: 'No access to provider', data: { userId, providerId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
    return null
  }

  // Backward compatibility: return first available provider
  // First check if user is a provider
  const provider = await prisma.provider.findUnique({
    where: { userId },
    select: {
      id: true,
      businessName: true,
      userId: true,
      industry: true,
      businessImage: true,
    },
  })

  if (provider) {
    return { provider }
  }

  // If not provider, check if user has UserProvider relationship
  const userProvider = await prisma.userProvider.findFirst({
    where: { userId },
    include: {
      provider: {
        select: {
          id: true,
          businessName: true,
          industry: true,
          userId: true,
          businessImage: true,
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

  if (userProvider) {
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
      },
    }
  }

  return null
}

