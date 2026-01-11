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
 * Since users can only be associated with one provider, this checks if the providerId matches their provider
 */
export async function validateProviderAccess(userId: string, providerId: string): Promise<boolean> {
  const accessContext = await getProviderAccess(userId)
  return accessContext?.provider.id === providerId
}

/**
 * Get provider access context for a user (either as provider or staff)
 * Each user can only be associated with one provider (either as owner or staff)
 */
export async function getProviderAccess(
  userId: string
): Promise<AccessContext | null> {
  // First check if user is a provider
  const provider = await prisma.provider.findUnique({
    where: { userId },
    select: {
      id: true,
      businessName: true,
      userId: true,
    },
  })

  if (provider) {
    return { provider }
  }

  // If not provider, check if user is staff
  const staffMember = await prisma.staffMember.findFirst({
    where: { 
      userId,
      isActive: true,
    },
    include: {
      provider: {
        select: {
          id: true,
          businessName: true,
          userId: true,
          status: true,
        },
      },
    },
  })

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
      },
    }
  }

  return null
}
