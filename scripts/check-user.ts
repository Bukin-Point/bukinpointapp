
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

config()

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString, max: 20 })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function checkUser() {
    const email = 'bukinpoint@gmail.com'
    console.log(`🔍 Checking user: ${email}`)

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            userProviders: {
                include: {
                    roles: {
                        include: {
                            role: true
                        }
                    },
                    provider: true
                }
            }
        }
    })

    if (!user) {
        console.log('❌ User not found in database.')
    } else {
        console.log('✅ User found:')
        console.log(`   ID: ${user.id}`)
        console.log(`   Clerk ID: ${user.clerkUserId}`)
        console.log(`   Providers: ${user.userProviders.length}`)

        user.userProviders.forEach(up => {
            console.log(`   🏠 Provider: ${up.provider.businessName} (${up.provider.id})`)
            console.log(`      Subdomain: ${up.provider.subdomain}`)
            console.log(`      Roles: ${up.roles.map(r => r.role.name).join(', ')}`)
        })
    }

    const systemUser = await prisma.user.findUnique({
        where: { email: 'admin@bukinpoint.com' }
    })
    if (systemUser) {
        console.log('ℹ️ Found seeded system admin: admin@bukinpoint.com')
    }

    await prisma.$disconnect()
    await pool.end()
}

checkUser()
