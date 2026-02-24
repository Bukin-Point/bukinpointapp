'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

/**
 * Syncs a user's RBAC permissions from the database to Clerk's publicMetadata.
 * This flattens roles and direct permissions into a per-provider array of strings.
 */
export async function syncUserRBAC(userId: string) {
    try {
        const clerk = await clerkClient()

        // 1. Fetch all UserProvider records for this user with their roles and direct permissions
        const userProviders = await prisma.userProvider.findMany({
            where: { userId, isActive: true },
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

        const permissionsMap: Record<string, string[]> = {}

        userProviders.forEach(up => {
            const perms = new Set<string>()

            // Add permissions from roles
            up.roles.forEach(upr => {
                upr.role.rolePermissions.forEach(rp => {
                    perms.add(rp.permission.name)
                })
            })

            // Add direct permissions
            up.permissions.forEach(upp => {
                perms.add(upp.permission.name)
            })

            // If owner, ensure they have key owner-like permissions if not explicitly set
            // (Though ideally the OWNER role handles this, we can be defensive)
            if (up.isOwner) {
                perms.add('view:dashboard')
                perms.add('manage:settings')
                perms.add('service:write')
                perms.add('service:read')
                perms.add('booking:read')
                perms.add('booking:create')
                perms.add('booking:update')
                perms.add('booking:delete')
                perms.add('staff:read')
                perms.add('staff:write')
                perms.add('manage:users')
                perms.add('manage:roles')
                perms.add('wallet:read')
                perms.add('wallet:payout')
            }

            permissionsMap[up.providerId] = Array.from(perms)
        })

        // 2. Fetch the user's Clerk ID from our DB if we only have the internal UUID
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { clerkUserId: true }
        })

        if (!dbUser?.clerkUserId) {
            console.error(`Cannot sync RBAC for user ${userId}: No clerkUserId found.`)
            return { error: 'No associated Clerk account found' }
        }

        // 3. Update Clerk publicMetadata
        await clerk.users.updateUserMetadata(dbUser.clerkUserId, {
            publicMetadata: {
                permissions: permissionsMap
            }
        })

        console.log(`Successfully synced RBAC for user ${userId} (${dbUser.clerkUserId})`)
        return { success: true }
    } catch (error: any) {
        console.error('Error syncing user RBAC to Clerk:', error)
        return { error: error.message || 'Unknown error' }
    }
}
