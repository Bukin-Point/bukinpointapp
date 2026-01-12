import { prisma } from './db'
import type { AccessContext } from './staff-helpers-client'

// Re-export types and client-safe utilities from client file
export type { StaffContext, ProviderContext, AccessContext } from './staff-helpers-client'

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
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'staff-helpers.ts:38',message:'Checking provider access',data:{userId,providerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'staff-helpers.ts:54',message:'Provider ownership check result',data:{userId,providerId,isOwner:!!provider,providerBusinessName:provider?.businessName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (provider) {
      return { provider }
    }

    // Check if user is staff for this provider
    const staffMember = await prisma.staffMember.findFirst({
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
      },
    })

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'staff-helpers.ts:77',message:'Staff membership check result',data:{userId,providerId,isStaff:!!staffMember,staffRole:staffMember?.role,providerStatus:staffMember?.provider?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    if (staffMember && staffMember.provider.status === 'ACTIVE') {
      return {
        staffMember: {
          id: staffMember.id,
          providerId: staffMember.providerId,
          role: staffMember.role,
          userId: staffMember.userId,
        },
        provider: {
          id: staffMember.provider.id,
          businessName: staffMember.provider.businessName,
          userId: staffMember.provider.userId,
          industry: staffMember.provider.industry,
          businessImage: staffMember.provider.businessImage,
        },
      }
    }

    // User doesn't have access to this provider
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/55297bb7-6ff5-481e-a112-b56b6ed47700',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'staff-helpers.ts:94',message:'No access to provider',data:{userId,providerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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

  // If not provider, check if user is staff
  const staffMember = await prisma.staffMember.findFirst({
    where: { userId },
  })

  if (staffMember) {
    // If provider relation didn't load, fetch it directly
    const provider = await prisma.provider.findUnique({
      where: { id: staffMember.providerId },
      select: {
        id: true,
        businessName: true,
        industry: true,
        userId: true,
        businessImage: true,
      },
    })

    if (provider) {
      return {
        staffMember: {
          id: staffMember.id,
          providerId: staffMember.providerId,
          role: staffMember.role,
          userId: staffMember.userId,
        },
        provider: {
          id: provider.id,
          businessName: provider.businessName,
          industry: provider.industry,
          userId: provider.userId,
          businessImage: provider.businessImage,
        },
      }
    } else {
      // Provider not found - log error for debugging
      console.error(
        `Provider not found for staff member ${staffMember.id} with providerId ${staffMember.providerId}`
      )
    }
  }

  return null
}
