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
  // Handle case where phone column doesn't exist yet in database
  try {
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
  } catch (error: any) {
    // If phone column doesn't exist, try to find existing user or create with raw query
    if (error?.message?.includes('column') || error?.code === 'P2021') {
      // Try to find existing user first
      const existingUser = await prisma.user.findUnique({
        where: { clerkUserId: userId },
      })

      if (existingUser) {
        // Update if needed (without phone field)
        const updatedUser = await prisma.user.update({
          where: { clerkUserId: userId },
          data: {
            email: user.primaryEmailAddress?.emailAddress || '',
            emailVerified: user.emailAddresses[0]?.verification?.status === 'verified',
            name: user.fullName || user.firstName || null,
            image: user.imageUrl || null,
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

      // Create new user using raw query to avoid phone field
      const result = await prisma.$executeRaw`
        INSERT INTO "user" (id, "clerkUserId", email, "emailVerified", name, image, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, ${userId}, ${user.primaryEmailAddress?.emailAddress || ''}, ${user.emailAddresses[0]?.verification?.status === 'verified'}, ${user.fullName || user.firstName || null}, ${user.imageUrl || null}, NOW(), NOW())
        ON CONFLICT ("clerkUserId") DO UPDATE SET
          email = EXCLUDED.email,
          "emailVerified" = EXCLUDED."emailVerified",
          name = EXCLUDED.name,
          image = EXCLUDED.image,
          "updatedAt" = NOW()
        RETURNING id, email, name, image
      `

      // Fetch the created/updated user
      const newUser = await prisma.user.findUnique({
        where: { clerkUserId: userId },
      })

      if (!newUser) {
        throw new Error('Failed to create or find user')
      }

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          image: newUser.image,
        },
      }
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
 */
export async function isUserSuperAdmin(email: string | null | undefined) {
  if (!email) return false

  // 1. Fallback to env var for bootstrap/recovery
  const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  if (envAdmins.includes(email.toLowerCase())) return true

  // 2. Check Database via UserProvider
  // We need to find if user has ANY UserProvider with SUPERADMIN role
  // Since SUPERADMIN is ideally global or attached to a system provider, we search across all providers for now OR rely on specific logic.
  // Ideally, we'd have a system provider. For now, let's check if they have the role in ANY provider context they belong to.

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      provider: { // If they own a provider
        select: {
          // We can't access userProvider via provider easily the other way without back-relation or finding UserProvider where userId = user.id
        }
      }
    }
  })

  // Better query: Find UserProvider records for this user that have the SUPERADMIN role
  const userProviders = await prisma.userProvider.findMany({
    where: {
      user: { email },
      roles: {
        some: {
          role: { name: 'SUPERADMIN' }
        }
      }
    }
  })

  return userProviders.length > 0
}

/**
 * Check if a user has a specific permission within a provider context
 */
export async function hasPermission(userId: string, providerId: string, permissionName: string) {
  const userProvider = await prisma.userProvider.findUnique({
    where: {
      userId_providerId: {
        userId,
        providerId
      }
    },
    include: {
      roles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      },
      permissions: {
        include: {
          permission: true
        }
      }
    }
  })

  if (!userProvider) return false

  // 1. Check Roles
  const rolePermissions = userProvider.roles.flatMap((upr: { role: { rolePermissions: { permission: { name: string } }[] } }) =>
    upr.role.rolePermissions.map((rp: { permission: { name: string } }) => rp.permission.name)
  )

  // 2. Check Direct Permissions
  const directPermissions = userProvider.permissions.map((upp: { permission: { name: string } }) => upp.permission.name)

  const allPermissions = new Set([...rolePermissions, ...directPermissions])

  return allPermissions.has(permissionName)
}
