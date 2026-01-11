import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { hex } from '@better-auth/utils/hex'
import { config } from 'dotenv'

// Load environment variables
config()

// Ensure DATABASE_URL is set
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set. Please set it in your .env file.')
}

// Set up Prisma with adapter (same as src/lib/db.ts)
const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
})

// Test password for all users
const TEST_PASSWORD = 'Test1234!'

// Better Auth password hashing (using scrypt, same as Better Auth)
const config_scrypt = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
}

async function generateKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return await scryptAsync(password.normalize('NFKC'), salt, {
    N: config_scrypt.N,
    p: config_scrypt.p,
    r: config_scrypt.r,
    dkLen: config_scrypt.dkLen,
    maxmem: 128 * config_scrypt.N * config_scrypt.r * 2,
  })
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await generateKey(password, salt)
  // Better Auth format: salt:key (both hex encoded)
  return `${hex.encode(salt)}:${hex.encode(key)}`
}

// Helper function to generate subdomain from business name
function generateSubdomain(businessName: string): string {
  if (!businessName || businessName.trim().length === 0) {
    return `business-${Date.now().toString().slice(-6)}`
  }

  return businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63)
}

// Helper function to generate unique subdomain
async function generateUniqueSubdomain(
  baseSubdomain: string,
  checkExists: (subdomain: string) => Promise<boolean>
): Promise<string> {
  if (!baseSubdomain || baseSubdomain.length < 3) {
    baseSubdomain = 'business'
  }

  let subdomain = baseSubdomain
  let counter = 1

  while (await checkExists(subdomain)) {
    const suffix = counter.toString()
    const maxLength = 63 - suffix.length - 1
    const truncated = baseSubdomain.substring(0, maxLength)
    subdomain = `${truncated}-${suffix}`
    counter++

    if (counter > 9999) {
      subdomain = `${baseSubdomain.substring(0, 50)}-${Date.now().toString().slice(-6)}`
      break
    }
  }

  return subdomain
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash password once for all users using Better Auth's scrypt format
  const hashedPassword = await hashPassword(TEST_PASSWORD)
  console.log('✅ Password hashed')

  // Clean up existing test data (for idempotency)
  console.log('🧹 Cleaning up existing test data...')
  const testEmails = [
    'provider1@test.com',
    'provider2@test.com',
    'staff-single@test.com',
    'staff-multi@test.com',
  ]

  for (const email of testEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        provider: true,
        staffMemberships: true,
      },
    })

    if (user) {
      // Delete related data first
      if (user.provider) {
        await prisma.wallet.deleteMany({
          where: { providerId: user.provider.id },
        })
        await prisma.service.deleteMany({
          where: { providerId: user.provider.id },
        })
        await prisma.staffMember.deleteMany({
          where: { providerId: user.provider.id },
        })
        await prisma.provider.delete({
          where: { id: user.provider.id },
        })
      }

      if (user.staffMemberships.length > 0) {
        for (const staff of user.staffMemberships) {
          await prisma.staffService.deleteMany({
            where: { staffId: staff.id },
          })
        }
        await prisma.staffMember.deleteMany({
          where: { userId: user.id },
        })
      }

      await prisma.account.deleteMany({
        where: { userId: user.id },
      })
      await prisma.user.delete({
        where: { id: user.id },
      })
    }
  }
  console.log('✅ Cleanup complete')

  // Create users and accounts
  console.log('👤 Creating users...')
  const provider1User = await prisma.user.create({
    data: {
      email: 'provider1@test.com',
      emailVerified: true,
      name: 'Provider One',
    },
  })

  const provider2User = await prisma.user.create({
    data: {
      email: 'provider2@test.com',
      emailVerified: true,
      name: 'Provider Two',
    },
  })

  const staffSingleUser = await prisma.user.create({
    data: {
      email: 'staff-single@test.com',
      emailVerified: true,
      name: 'Staff Single',
    },
  })

  const staffMultiUser = await prisma.user.create({
    data: {
      email: 'staff-multi@test.com',
      emailVerified: true,
      name: 'Staff Multi',
    },
  })
  console.log('✅ Users created')

  // Create accounts with hashed passwords (Better Auth)
  console.log('🔐 Creating accounts...')
  await prisma.account.createMany({
    data: [
      {
        accountId: provider1User.email,
        providerId: 'credential',
        userId: provider1User.id,
        password: hashedPassword,
      },
      {
        accountId: provider2User.email,
        providerId: 'credential',
        userId: provider2User.id,
        password: hashedPassword,
      },
      {
        accountId: staffSingleUser.email,
        providerId: 'credential',
        userId: staffSingleUser.id,
        password: hashedPassword,
      },
      {
        accountId: staffMultiUser.email,
        providerId: 'credential',
        userId: staffMultiUser.id,
        password: hashedPassword,
      },
    ],
  })
  console.log('✅ Accounts created')

  // Create providers with subdomains
  console.log('🏢 Creating providers...')
  const businessOneSubdomain = await generateUniqueSubdomain(
    generateSubdomain('Business One'),
    async subdomain => {
      const exists = await prisma.provider.findUnique({
        where: { subdomain },
      })
      return !!exists
    }
  )

  const businessTwoSubdomain = await generateUniqueSubdomain(
    generateSubdomain('Business Two'),
    async subdomain => {
      const exists = await prisma.provider.findUnique({
        where: { subdomain },
      })
      return !!exists
    }
  )

  const provider1 = await prisma.provider.create({
    data: {
      userId: provider1User.id,
      businessName: 'Business One',
      subdomain: businessOneSubdomain,
      industry: 'Beauty & Wellness',
      phone: '+1234567890',
      email: 'provider1@test.com',
      timezone: 'Africa/Lagos',
      status: 'ACTIVE',
    },
  })

  const provider2 = await prisma.provider.create({
    data: {
      userId: provider2User.id,
      businessName: 'Business Two',
      subdomain: businessTwoSubdomain,
      industry: 'Beauty & Wellness',
      phone: '+1234567890',
      email: 'provider2@test.com',
      timezone: 'Africa/Lagos',
      status: 'ACTIVE',
    },
  })
  console.log('✅ Providers created')

  // Create wallets for providers
  console.log('💰 Creating wallets...')
  await prisma.wallet.createMany({
    data: [
      {
        providerId: provider1.id,
        balance: 0,
        totalEarnings: 0,
      },
      {
        providerId: provider2.id,
        balance: 0,
        totalEarnings: 0,
      },
    ],
  })
  console.log('✅ Wallets created')

  // Create services for each provider
  console.log('🛍️ Creating services...')
  const provider1Service1 = await prisma.service.create({
    data: {
      providerId: provider1.id,
      name: 'Haircut',
      description: 'Professional haircut service',
      duration: 30,
      price: 25.0,
      isActive: true,
    },
  })

  const provider1Service2 = await prisma.service.create({
    data: {
      providerId: provider1.id,
      name: 'Hair Color',
      description: 'Full hair coloring service',
      duration: 120,
      price: 80.0,
      isActive: true,
    },
  })

  const provider1Service3 = await prisma.service.create({
    data: {
      providerId: provider1.id,
      name: 'Hair Styling',
      description: 'Professional hair styling',
      duration: 45,
      price: 40.0,
      isActive: true,
    },
  })

  const provider1ServiceList = [provider1Service1, provider1Service2, provider1Service3]

  const provider2Service1 = await prisma.service.create({
    data: {
      providerId: provider2.id,
      name: 'Massage',
      description: 'Relaxing full body massage',
      duration: 60,
      price: 60.0,
      isActive: true,
    },
  })

  const provider2Service2 = await prisma.service.create({
    data: {
      providerId: provider2.id,
      name: 'Facial Treatment',
      description: 'Deep cleansing facial',
      duration: 45,
      price: 50.0,
      isActive: true,
    },
  })

  const provider2Service3 = await prisma.service.create({
    data: {
      providerId: provider2.id,
      name: 'Manicure',
      description: 'Professional nail care',
      duration: 30,
      price: 25.0,
      isActive: true,
    },
  })

  const provider2ServiceList = [provider2Service1, provider2Service2, provider2Service3]
  console.log('✅ Services created')

  // Create staff members
  console.log('👥 Creating staff members...')
  const staffSingle = await prisma.staffMember.create({
    data: {
      providerId: provider1.id,
      userId: staffSingleUser.id,
      role: 'STAFF',
      isActive: true,
    },
  })

  const staffMultiProvider1 = await prisma.staffMember.create({
    data: {
      providerId: provider1.id,
      userId: staffMultiUser.id,
      role: 'OWNER',
      isActive: true,
    },
  })

  const staffMultiProvider2 = await prisma.staffMember.create({
    data: {
      providerId: provider2.id,
      userId: staffMultiUser.id,
      role: 'STAFF',
      isActive: true,
    },
  })
  console.log('✅ Staff members created')

  // Create staff-service assignments
  console.log('🔗 Creating staff-service assignments...')
  // Staff Single: Assign to first 2 services from Provider 1
  await prisma.staffService.createMany({
    data: [
      {
        staffId: staffSingle.id,
        serviceId: provider1ServiceList[0].id,
      },
      {
        staffId: staffSingle.id,
        serviceId: provider1ServiceList[1].id,
      },
    ],
  })

  // Staff Multi for Provider 1 (OWNER): Assign to all services
  await prisma.staffService.createMany({
    data: provider1ServiceList.map(service => ({
      staffId: staffMultiProvider1.id,
      serviceId: service.id,
    })),
  })

  // Staff Multi for Provider 2 (STAFF): Assign to first 2 services
  await prisma.staffService.createMany({
    data: [
      {
        staffId: staffMultiProvider2.id,
        serviceId: provider2ServiceList[0].id,
      },
      {
        staffId: staffMultiProvider2.id,
        serviceId: provider2ServiceList[1].id,
      },
    ],
  })
  console.log('✅ Staff-service assignments created')

  console.log('\n✨ Seed completed successfully!')
  console.log('\n📊 Test Data Summary:')
  console.log(`   - Users: 4 (2 providers, 2 staff)`)
  console.log(`   - Providers: 2 (Business One, Business Two)`)
  console.log(`   - Services: 6 (3 per provider)`)
  console.log(`   - Staff Members: 3 (1 single, 2 multi)`)
  console.log(`   - Wallets: 2`)
  console.log(`\n🔑 All users have password: ${TEST_PASSWORD}`)
  console.log(`\n📝 Provider 1 subdomain: ${businessOneSubdomain}`)
  console.log(`📝 Provider 2 subdomain: ${businessTwoSubdomain}`)
}

main()
  .catch(error => {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
