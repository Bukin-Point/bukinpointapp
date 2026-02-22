import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const PAYMENT_CONFIG_ID = 'clpaymentconfig0default'

    console.log('--- Payment Configuration Force Update ---')

    // 1. Update global config
    const config = await prisma.paymentConfig.upsert({
        where: { id: PAYMENT_CONFIG_ID },
        create: {
            id: PAYMENT_CONFIG_ID,
            currentGateway: 'PAYSTACK',
            updatedAt: new Date(),
        },
        update: {
            currentGateway: 'PAYSTACK',
            updatedAt: new Date(),
        },
    })
    console.log(`Global gateway set to: ${config.currentGateway}`)

    // 2. Clear any provider overrides that were set to OPAY
    // (Optional: Only if you want to force everyone back to Paystack immediately)
    const result = await prisma.provider.updateMany({
        where: { paymentGateway: 'OPAY' },
        data: { paymentGateway: 'PAYSTACK' } // Or set to null to follow global default
    })
    console.log(`Updated ${result.count} providers from OPay to Paystack`)

    console.log('-----------------------------------------')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
