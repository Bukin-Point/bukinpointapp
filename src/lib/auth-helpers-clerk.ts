'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './db'

/**
 * Get current session using Clerk
 * Replaces Better Auth's getSession
 */
export async function getSession() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await currentUser()

  if (!user) {
    return null
  }

  // Find or create user in database linked to Clerk user
  const dbUser = await prisma.user.upsert({
    where: { clerkUserId: userId },
    create: {
      clerkUserId: userId,
      email: user.primaryEmailAddress?.emailAddress || '',
      emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
      name: user.fullName || user.firstName || null,
      image: user.imageUrl || null,
    },
    update: {
      email: user.primaryEmailAddress?.emailAddress || '',
      emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
      name: user.fullName || user.firstName || null,
      image: user.imageUrl || null,
    },
  })

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
    },
  }
}

/**
 * Get user type from Clerk metadata (fast lookup)
 */
export async function getUserTypeFromMetadata(): Promise<'provider' | 'staff' | 'customer' | null> {
  try {
    const user = await currentUser()
    if (user?.publicMetadata?.accountType) {
      return user.publicMetadata.accountType as 'provider' | 'staff' | 'customer'
    }
  } catch (error) {
    console.warn('Error reading Clerk metadata:', error)
  }
  return null
}

/**
 * Get user type (provider, staff, or customer)
 * Checks Clerk metadata first, then falls back to database lookup
 */
export async function getUserType(session: { user: { id: string } } | null): Promise<'provider' | 'staff' | 'customer' | null> {
  if (!session?.user?.id) {
    return null
  }

  // Check Clerk metadata first (faster, no database query)
  const metadataType = await getUserTypeFromMetadata()
  if (metadataType) {
    return metadataType
  }

  // Fallback to database lookup if metadata not available
  // Check if user is a provider
  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
  })

  if (provider) {
    return 'provider'
  }

  // Check if user is staff
  const staffMember = await prisma.staffMember.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (staffMember) {
    return 'staff'
  }

  // Otherwise, they're a customer
  return 'customer'
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
