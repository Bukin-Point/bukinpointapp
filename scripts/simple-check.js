
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('--- START CHECK ---')
    const user = await prisma.user.findFirst({
        where: { email: 'bukinpoint@gmail.com' },
        include: {
            userProviders: {
                include: {
                    roles: { include: { role: true } },
                    provider: true
                }
            }
        }
    })

    if (!user) {
        console.log('USER_NOT_FOUND: bukinpoint@gmail.com')
    } else {
        console.log('USER_FOUND')
        console.log('ID:', user.id)
        console.log('CLERK_ID:', user.clerkUserId)
        console.log('PROVIDER_COUNT:', user.userProviders.length)
        user.userProviders.forEach(up => {
            console.log(`PROVIDER: ${up.provider.businessName} (${up.provider.id}) - Roles: ${up.roles.map(r => r.role.name).join(',')}`)
        })
    }
    console.log('--- END CHECK ---')
}

main().catch(console.error).finally(() => prisma.$disconnect())
