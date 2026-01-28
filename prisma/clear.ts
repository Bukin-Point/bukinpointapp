import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

// Load environment variables
config()

// Ensure DATABASE_URL is set
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please set it in your .env file.'
  )
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

async function main() {
  console.log('🧹 Starting database cleanup...')

  // Delete in order to respect foreign key constraints
  // Start with tables that have foreign keys pointing to them

  console.log('Deleting transactions...')
  await prisma.transaction.deleteMany()
  console.log('✅ Transactions deleted')

  console.log('Deleting bookings...')
  await prisma.booking.deleteMany()
  console.log('✅ Bookings deleted')

  console.log('Deleting availability...')
  await prisma.availability.deleteMany()
  console.log('✅ Availability deleted')

  console.log('Deleting staff services...')
  await prisma.staffService.deleteMany()
  console.log('✅ Staff services deleted')

  console.log('Deleting services...')
  await prisma.service.deleteMany()
  console.log('✅ Services deleted')

  console.log('Deleting staff invitations...')
  await prisma.staffInvitation.deleteMany()
  console.log('✅ Staff invitations deleted')

  console.log('Deleting staff members...')
  await prisma.staffMember.deleteMany()
  console.log('✅ Staff members deleted')

  console.log('Deleting wallets...')
  await prisma.wallet.deleteMany()
  console.log('✅ Wallets deleted')

  console.log('Deleting providers...')
  await prisma.provider.deleteMany()
  console.log('✅ Providers deleted')

  // Note: Session, Account, and Verification models were removed after migrating to Clerk
  // Clerk handles authentication, so these are no longer needed

  console.log('Deleting users...')
  await prisma.user.deleteMany()
  console.log('✅ Users deleted')

  console.log('\n✨ Database cleanup completed successfully!')
  console.log('All tables are now empty.')
}

main()
  .catch((error) => {
    console.error('❌ Error cleaning database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
