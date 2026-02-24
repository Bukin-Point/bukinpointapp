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

  const userEmail = user.primaryEmailAddress?.emailAddress || ''
  const isEmailVerified = user.emailAddresses[0]?.verification?.status === 'verified'
  const userName = user.fullName || user.firstName || null
  const userImage = user.imageUrl || null

  try {
    // 1. Try to find user by Clerk ID first
    console.log(`[Auth] Fetching session for Clerk user: ${userId}`)
    let dbUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    })

    // 2. If not found by Clerk ID, check by email
    if (!dbUser && userEmail) {
      console.log(`[Auth] Clerk ID ${userId} not found in DB, checking by email: ${userEmail}`)
      dbUser = await prisma.user.findUnique({
        where: { email: userEmail },
      })

      // If found by email, link the Clerk ID
      if (dbUser) {
        console.log(`[Auth] Found existing user by email, linking Clerk ID: ${dbUser.id}`)
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            clerkUserId: userId,
            emailVerified: isEmailVerified, // Update verification status from Clerk
            name: dbUser.name || userName,  // Don't overwrite if existing name
            image: dbUser.image || userImage,
          },
        })
      }
    }

    // 3. If still not found, create new user (using upsert on clerkUserId for safety)
    if (!dbUser) {
      console.log(`[Auth] Creating new user for Clerk ID: ${userId}`)
      dbUser = await prisma.user.upsert({
        where: { clerkUserId: userId },
        create: {
          clerkUserId: userId,
          email: userEmail,
          emailVerified: isEmailVerified,
          name: userName || 'New User', // Fallback for null name
          image: userImage,
        },
        update: {
          email: userEmail,
          emailVerified: isEmailVerified,
          name: userName || 'User',
          image: userImage,
        },
      })
    }

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
      },
    }
  } catch (error: any) {
    // Fallback for cases where migrations are out of sync (e.g. phone column issue)
    if (error?.message?.includes('column') || error?.code === 'P2021' || error?.code === 'P2002') {
      // Find current user state by email if clerkUserId search failed
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkUserId: userId },
            { email: userEmail }
          ]
        }
      })

      if (existingUser) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            clerkUserId: userId,
            email: userEmail,
            emailVerified: isEmailVerified,
            name: existingUser.name || userName,
            image: existingUser.image || userImage,
          },
        })

        return {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            image: updatedUser.image,
          },
        }
      }

      // Final fallback: Raw SQL with multi-conflict handling
      // Note: PostgreSQL doesn't support multiple ON CONFLICT targets easily in a single statement without complex logic, 
      // but we can target the most likely one (email) and rely on the app logic above for clerkUserId.
      await prisma.$executeRaw`
        INSERT INTO "user" (id, "clerkUserId", email, "emailVerified", name, image, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${userId}, ${userEmail}, ${isEmailVerified}, ${userName}, ${userImage}, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          "clerkUserId" = EXCLUDED."clerkUserId",
          "emailVerified" = EXCLUDED."emailVerified",
          updatedAt = NOW()
      `

      const newUser = await prisma.user.findUnique({
        where: { clerkUserId: userId },
      })

      if (!newUser) throw new Error('Failed to create/link user after raw fallback')

      return { user: { id: newUser.id, email: newUser.email, name: newUser.name, image: newUser.image } }
    }
    throw error
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
    console.log(`[Auth] Identity found in Clerk metadata: ${metadataType}`)
    return metadataType
  }

  // Fallback to database lookup if metadata not available
  // Check if user is a provider
  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
  })

  if (provider) {
    console.log(`[Auth] Identity found in DB (Provider record exists): provider`)
    return 'provider'
  }

  // Check if user has UserProvider relationship (staff)
  const userProvider = await prisma.userProvider.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (userProvider) {
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

/**
 * Check if a user is a super admin based on RBAC roles
 * Now driven by the 'system:manage' permission in the token or DB
 */
export async function isUserSuperAdmin() {
  const { sessionClaims } = await auth()

  // 1. Check Token Claims (Fastest)
  const permissions = (sessionClaims?.metadata as any)?.permissions || {}
  const systemPerms = permissions['clsystemprovider000000'] || []

  if (systemPerms.includes('system:manage')) return true

  return false
}

/**
 * Check if a user has a specific permission within a provider context.
 * Uses session claims for instant verification without DB hits.
 */
export async function hasPermission(providerId: string, permissionName: string) {
  const { sessionClaims, userId: clerkUserId } = await auth()

  const metadata = (sessionClaims?.metadata as any) || {}
  const allPermissions = metadata.permissions || {}

  // 1. Check specific provider permissions
  const providerPerms = allPermissions[providerId] || []
  if (providerPerms.includes(permissionName)) return true

  // 2. Check for Global System Admin override
  const systemPerms = allPermissions['clsystemprovider000000'] || []
  if (systemPerms.includes('system:manage')) return true

  // 3. DB Fallback: Check if user is the direct provider owner
  if (clerkUserId) {
    const user = await prisma.user.findUnique({ where: { clerkUserId } })
    if (user) {
      // Check direct provider ownership
      const provider = await prisma.provider.findFirst({
        where: { id: providerId, userId: user.id }
      })

      const PROVIDER_FULL_PERMISSIONS = [
        'view:dashboard', 'manage:settings', 'booking:read', 'booking:create',
        'booking:update', 'booking:delete', 'service:read', 'service:write',
        'manage:users', 'manage:roles', 'wallet:read', 'wallet:payout'
      ]

      if (provider && PROVIDER_FULL_PERMISSIONS.includes(permissionName)) {
        return true
      }

      // Check UserProvider isOwner flag
      const userProvider = await prisma.userProvider.findFirst({
        where: { providerId, userId: user.id, isOwner: true, isActive: true }
      })

      if (userProvider && PROVIDER_FULL_PERMISSIONS.includes(permissionName)) {
        return true
      }
    }
  }

  return false
}

/**
 * Get all permissions for a provider from the session token
 */
export async function getProviderPermissions(providerId: string): Promise<string[]> {
  const { sessionClaims } = await auth()
  const allPermissions = (sessionClaims?.metadata as any)?.permissions || {}
  return allPermissions[providerId] || []
}
