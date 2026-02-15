import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { config } from 'dotenv'

// Simple hex encoding function
function hexEncode(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

// Load environment variables
config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString, max: 20 })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter, log: ['error', 'warn'] })

// Admin configuration from environment
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@bukinpoint.com'
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Super Admin'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123!'

// Password hashing
async function generateKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
    return await scryptAsync(password.normalize('NFKC'), salt, {
        N: 16384,
        p: 1,
        r: 16,
        dkLen: 64,
        maxmem: 128 * 16384 * 16 * 2,
    })
}

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await generateKey(password, salt)
    return `${hexEncode(salt)}:${hexEncode(key)}`
}

async function main() {
    console.log('🌱 Starting refined admin seeding...')

    // 1. Clean up existing RBAC data (be careful if in production, but this is a seed)
    console.log('🧹 Cleaning up infrastructure data...')
    await prisma.userProviderRole.deleteMany()
    await prisma.userProviderPermission.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()

    // 2. Create or Update System Provider
    console.log('🏢 Ensuring System Provider exists...')
    const systemProvider = await prisma.provider.upsert({
        where: { id: 'clsystemprovider000000' },
        update: {
            businessName: 'BukinPoint System',
            status: 'ACTIVE',
            subdomain: 'admin',
        },
        create: {
            id: 'clsystemprovider000000',
            businessName: 'BukinPoint System',
            status: 'ACTIVE',
            subdomain: 'admin',
            industry: 'Technology',
            phone: '+2340000000000',
            email: 'system@bukinpoint.com',
            userId: 'clsystemuser000000', // Placeholder or a dedicated system user ID
        }
    })

    // Create a placeholder system user if it doesn't exist
    await prisma.user.upsert({
        where: { clerkUserId: 'clsystemuser000000' },
        create: {
            id: 'clsystemuser000000',
            clerkUserId: 'clsystemuser000000',
            email: 'system@bukinpoint.com',
            name: 'System User',
        },
        update: {}
    })

    // 3. Create Roles
    console.log('🛡️  Creating Roles...')
    const superAdminRole = await prisma.role.create({
        data: { name: 'SUPERADMIN', description: 'System Super Administrator (Platform Wide)' }
    })

    const ownerRole = await prisma.role.create({
        data: { name: 'OWNER', description: 'Business Owner (Provider Admin)' }
    })

    const staffRole = await prisma.role.create({
        data: { name: 'STAFF', description: 'Regular Staff Member' }
    })

    // 4. Create permissions
    console.log('🔑 Creating Permissions...')
    const permissionsList = [
        { name: 'manage:settings', desc: 'Manage system/provider settings' },
        { name: 'manage:users', desc: 'Manage staff and invitations' },
        { name: 'booking:read', desc: 'View bookings' },
        { name: 'booking:create', desc: 'Create new bookings' },
        { name: 'booking:update', desc: 'Modify existing bookings' },
        { name: 'system:manage', desc: 'Full system administrative access' }
    ]

    for (const p of permissionsList) {
        const permission = await prisma.permission.create({
            data: { name: p.name, description: p.desc }
        })

        // Assign to roles
        if (p.name === 'system:manage') {
            await prisma.rolePermission.create({
                data: { roleId: superAdminRole.id, permissionId: permission.id }
            })
        } else {
            // Owner gets everything except system:manage
            await prisma.rolePermission.create({
                data: { roleId: ownerRole.id, permissionId: permission.id }
            })

            // Staff gets booking permissions
            if (p.name.startsWith('booking:')) {
                await prisma.rolePermission.create({
                    data: { roleId: staffRole.id, permissionId: permission.id }
                })
            }
        }
    }

    console.log('✅ RBAC Infrastructure Seeded')
    console.log('\n📊 Summary:')
    console.log(`   - System Provider ID: ${systemProvider.id}`)
    console.log(`   - Roles: SUPERADMIN, OWNER, STAFF`)
    console.log(`   - Permissions: ${permissionsList.length} created`)
    console.log('\n✨ Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await pool.end()
        await prisma.$disconnect()
    })
