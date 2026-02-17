'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-helpers-clerk'
import { revalidatePath } from 'next/cache'
import { syncUserRBAC } from './rbac'

export async function promoteToSuperAdmin(secret: string) {
    const session = await getSession()
    if (!session) {
        return { error: 'You must be signed in to perform this action' }
    }

    const ADMIN_SIGNUP_SECRET = process.env.ADMIN_SIGNUP_SECRET
    if (!ADMIN_SIGNUP_SECRET || secret !== ADMIN_SIGNUP_SECRET) {
        return { error: 'Invalid secret' }
    }

    try {
        // 1. Find the SUPERADMIN role
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'SUPERADMIN' }
        })

        if (!superAdminRole) {
            return { error: 'SUPERADMIN role not found. Please run seeding first.' }
        }

        // 2. Find or create the System Provider
        const systemProvider = await prisma.provider.findFirst({
            where: { id: 'clsystemprovider000000' }
        })

        if (!systemProvider) {
            return { error: 'System Provider not found. Please run seeding first.' }
        }

        // 3. Create UserProvider link with SUPERADMIN role
        const userProvider = await prisma.userProvider.upsert({
            where: {
                userId_providerId: {
                    userId: session.user.id,
                    providerId: systemProvider.id
                }
            },
            update: {
                isActive: true,
                isOwner: true // Admins are effectively owners of the system provider
            },
            create: {
                userId: session.user.id,
                providerId: systemProvider.id,
                isActive: true,
                isOwner: true
            }
        })

        // 4. Assign the role
        await prisma.userProviderRole.upsert({
            where: {
                userProviderId_roleId: {
                    userProviderId: userProvider.id,
                    roleId: superAdminRole.id
                }
            },
            update: {},
            create: {
                userProviderId: userProvider.id,
                roleId: superAdminRole.id
            }
        })

        // 5. Sync permissions to Clerk token
        await syncUserRBAC(session.user.id)

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error('Promotion error:', error)
        return { error: error.message || 'An unexpected error occurred' }
    }
}
