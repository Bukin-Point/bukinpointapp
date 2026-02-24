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

export async function getProviderDetails(providerId: string) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        const provider = await prisma.provider.findUnique({
            where: { id: providerId },
            include: {
                user: { select: { email: true, name: true, image: true } },
                services: { orderBy: { name: 'asc' } },
                userProviders: {
                    include: { user: { select: { name: true, email: true, image: true } } },
                    where: { isActive: true }
                },
                _count: { select: { bookings: true, invitations: true } },
                wallet: true
            }
        })

        if (!provider) return { success: false, error: 'Provider not found' }

        // Get recent bookings for this provider
        const recentBookings = await prisma.booking.findMany({
            where: { providerId },
            take: 10,
            orderBy: { bookingDate: 'desc' },
            include: { service: { select: { name: true } } }
        })

        return { success: true, provider, recentBookings }
    } catch (error) {
        console.error('[Admin] Error fetching provider details:', error)
        return { success: false, error: 'Failed to fetch provider details' }
    }
}

export async function getCustomerDetails(userId: string) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                bookings: {
                    include: {
                        provider: { select: { businessName: true } },
                        service: { select: { name: true } },
                        transaction: true
                    },
                    orderBy: { bookingDate: 'desc' }
                },
                _count: { select: { userProviders: true } }
            }
        })

        if (!user) return { success: false, error: 'User not found' }

        return { success: true, user }
    } catch (error) {
        console.error('[Admin] Error fetching customer details:', error)
        return { success: false, error: 'Failed to fetch customer details' }
    }
}

export async function getTransactionDetails(transactionId: string) {
    try {
        const session = await getSession()
        if (!session) return { success: false, error: 'Unauthorized' }
        const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')
        if (!canManageSystem) return { success: false, error: 'Forbidden' }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                booking: {
                    include: {
                        provider: true,
                        service: true,
                        user: { select: { name: true, email: true } }
                    }
                }
            }
        })

        if (!transaction) return { success: false, error: 'Transaction not found' }

        return { success: true, transaction }
    } catch (error) {
        console.error('[Admin] Error fetching transaction details:', error)
        return { success: false, error: 'Failed to fetch transaction details' }
    }
}
