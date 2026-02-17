'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-helpers-clerk'
import { hasPermission } from '@/lib/auth-helpers-clerk'
import { setGlobalPaymentGateway } from '@/lib/payment-config'
import { PaymentGateway } from '@prisma/client'

export async function getPlatformStats() {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }

        // SECURITY: High-level check
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        const [totalProviders, totalUsers, revenueData, totalTransactions] = await Promise.all([
            prisma.provider.count({ where: { NOT: { id: 'clsystemprovider000000' } } }),
            prisma.user.count(),
            prisma.transaction.aggregate({
                where: { status: 'PAID' },
                _sum: { platformFee: true, netAmount: true, amount: true }
            }),
            prisma.transaction.count()
        ])

        // Get recent transactions across platform
        const recentTransactions = await prisma.transaction.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                booking: {
                    include: {
                        provider: true,
                        service: true
                    }
                }
            }
        })

        return {
            success: true,
            stats: {
                providers: totalProviders,
                users: totalUsers,
                platformRevenue: Number(revenueData._sum.platformFee || 0),
                totalVolume: Number(revenueData._sum.amount || 0),
                transactions: totalTransactions
            },
            recentTransactions
        }
    } catch (error) {
        console.error('[Admin] Error fetching platform stats:', error)
        return { success: false, error: 'Internal Server Error' }
    }
}

export async function getAllProviders() {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        const providers = await prisma.provider.findMany({
            where: { NOT: { id: 'clsystemprovider000000' } },
            include: {
                user: { select: { email: true } },
                _count: { select: { services: true, bookings: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, providers }
    } catch (error) {
        console.error('[Admin] Error fetching providers:', error)
        return { success: false, error: 'Failed to fetch providers' }
    }
}

export async function getAllPlatformUsers() {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        const users = await prisma.user.findMany({
            include: {
                _count: { select: { bookings: true, userProviders: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit for now
        })

        return { success: true, users }
    } catch (error) {
        console.error('[Admin] Error fetching users:', error)
        return { success: false, error: 'Failed to fetch users' }
    }
}

export async function getAllTransactions() {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        const transactions = await prisma.transaction.findMany({
            include: {
                booking: {
                    include: {
                        provider: { select: { businessName: true } },
                        service: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 200 // Limit for now
        })

        return { success: true, transactions }
    } catch (error) {
        console.error('[Admin] Error fetching transactions:', error)
        return { success: false, error: 'Failed to fetch transactions' }
    }
}

export async function updateGlobalGateway(gateway: PaymentGateway) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        await setGlobalPaymentGateway(gateway)
        return { success: true }
    } catch (error) {
        console.error('[Admin] Error updating global gateway:', error)
        return { success: false, error: 'Failed to update gateway' }
    }
}
