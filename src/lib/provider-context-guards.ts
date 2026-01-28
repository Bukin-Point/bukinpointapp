'use server'

import { prisma } from './db'

/**
 * Validate that a user has access to a specific provider
 * SECURITY: This must be called before any data access
 */
export async function validateProviderAccess(
  userId: string,
  providerId: string
): Promise<boolean> {
  try {
    // Check if user is the provider owner
    const provider = await prisma.provider.findFirst({
      where: {
        id: providerId,
        userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    if (provider) {
      return true
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
            status: true,
          },
        },
      },
    })

    if (staffMember && staffMember.provider.status === 'ACTIVE') {
      return true
    }

    return false
  } catch (error) {
    console.error('Error validating provider access:', error)
    return false
  }
}

/**
 * Check if user owns a provider (not just staff)
 */
export async function checkProviderOwnership(
  userId: string,
  providerId: string
): Promise<boolean> {
  try {
    const provider = await prisma.provider.findFirst({
      where: {
        id: providerId,
        userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    return !!provider
  } catch (error) {
    console.error('Error checking provider ownership:', error)
    return false
  }
}

