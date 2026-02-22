import { prisma } from '@/lib/db'

/**
 * Calculates the service charge (platform fee) based on the global platform settings.
 * Default: 2.5% capped at ₦2,000.
 */
export async function calculateServiceCharge(servicePrice: number) {
    let percentage = 2.5
    let cap = 2000

    try {
        // Fetch platform settings from database
        const config = await prisma.paymentConfig.findFirst({
            orderBy: { updatedAt: 'desc' },
            // We use a broader query to avoid potential validation errors with outdated clients
        })

        if (config) {
            // Use casted access to avoid TS/Prisma validation issues with newer fields
            const anyConfig = config as any
            percentage = Number(anyConfig.platformFeePercentage ?? 2.5)
            cap = Number(anyConfig.platformFeeCap ?? 2000)
        }
    } catch (error) {
        console.error('[calculateServiceCharge] Database lookup failed, using defaults:', error)
    }

    // Calculate fee: (price * percentage / 100)
    const calculatedFee = servicePrice * (percentage / 100)
    const fee = Math.min(calculatedFee, cap)

    return {
        fee,
        percentage,
        cap,
        total: servicePrice + fee,
        totalKobo: Math.round((servicePrice + fee) * 100)
    }
}
