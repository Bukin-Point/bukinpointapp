import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        include: {
            provider: true,
            userProviders: {
                include: {
                    provider: true
                }
            },
        },
    })

    console.log('--- User Diagnostic ---')
    users.forEach(user => {
        console.log(`User: ${user.name} (${user.email})`)
        console.log(` - ID: ${user.id}`)
        console.log(` - Clerk ID: ${user.clerkUserId}`)
        if (user.provider) {
            console.log(` - Owned Provider: ${user.provider.businessName} (${user.provider.id})`)
        } else {
            console.log(` - Owned Provider: None`)
        }
        console.log(` - Staff Memberships: ${user.userProviders.length}`)
        user.userProviders.forEach(up => {
            console.log(`   * ${up.provider.businessName} (Owner: ${up.isOwner}, Active: ${up.isActive})`)
        })
        console.log('---------------------')
    })
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
