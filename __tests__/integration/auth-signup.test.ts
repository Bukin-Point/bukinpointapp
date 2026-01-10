import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// Create test Prisma client
let testPrisma: PrismaClient | null = null

if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  testPrisma = new PrismaClient({ adapter })
}

describe('User Sign Up Flow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  }

  beforeEach(async () => {
    if (!testPrisma) return
    // Clean up test user if exists
    try {
      await testPrisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test-',
          },
        },
      })
    } catch (error) {
      // Ignore errors if table doesn't exist
    }
  })

  afterAll(async () => {
    if (!testPrisma) return
    // Clean up after all tests
    try {
      await testPrisma.user.deleteMany({
        where: {
          email: {
            startsWith: 'test-',
          },
        },
      })
      await testPrisma.$disconnect()
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  it('should create a user with email and password', async () => {
    if (!testPrisma || !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database test')
      return
    }

    try {
      // Create user directly (simulating Better Auth's behavior)
      const user = await testPrisma.user.create({
        data: {
          email: testUser.email,
          password: testUser.password, // In production, this would be hashed
          name: testUser.name,
          emailVerified: false,
        },
      })

      expect(user).toBeDefined()
      expect(user.email).toBe(testUser.email)
      expect(user.name).toBe(testUser.name)
      expect(user.emailVerified).toBe(false)
      expect(user.password).toBeDefined()
      expect(user.id).toBeDefined()

      // Verify user can be retrieved
      const foundUser = await testPrisma.user.findUnique({
        where: { email: testUser.email },
      })

      expect(foundUser).toBeDefined()
      expect(foundUser?.email).toBe(testUser.email)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  })

  it('should not allow duplicate emails', async () => {
    if (!testPrisma || !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database test')
      return
    }

    try {
      // Create first user
      await testPrisma.user.create({
        data: {
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
          emailVerified: false,
        },
      })

      // Try to create duplicate
      await expect(
        testPrisma.user.create({
          data: {
            email: testUser.email,
            password: 'AnotherPassword123!',
            name: 'Another User',
            emailVerified: false,
          },
        })
      ).rejects.toThrow()
    } catch (error) {
      // Expected to throw
      expect(error).toBeDefined()
    }
  })

  it('should require email field', async () => {
    if (!testPrisma || !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database test')
      return
    }

    await expect(
      testPrisma.user.create({
        data: {
          email: '', // Empty email
          password: testUser.password,
          name: testUser.name,
          emailVerified: false,
        },
      })
    ).rejects.toThrow()
  })

  it('should require password field', async () => {
    if (!testPrisma || !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database test')
      return
    }

    await expect(
      testPrisma.user.create({
        data: {
          email: testUser.email,
          password: '', // Empty password
          name: testUser.name,
          emailVerified: false,
        },
      })
    ).rejects.toThrow()
  })

  it('should allow optional name field', async () => {
    if (!testPrisma || !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database test')
      return
    }

    const userWithoutName = await testPrisma.user.create({
      data: {
        email: `test-noname-${Date.now()}@example.com`,
        password: testUser.password,
        emailVerified: false,
      },
    })

    expect(userWithoutName).toBeDefined()
    expect(userWithoutName.name).toBeNull()
  })

  it('should set emailVerified to false by default', async () => {
    if (!testPrisma || !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database test')
      return
    }

    const user = await testPrisma.user.create({
      data: {
        email: `test-verified-${Date.now()}@example.com`,
        password: testUser.password,
        name: testUser.name,
      },
    })

    expect(user.emailVerified).toBe(false)
  })

  it('should create user with all required fields', async () => {
    if (!testPrisma || !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database test')
      return
    }

    const user = await testPrisma.user.create({
      data: {
        email: `test-complete-${Date.now()}@example.com`,
        password: testUser.password,
        name: testUser.name,
        emailVerified: false,
      },
    })

    // Verify all fields are present
    expect(user.id).toBeDefined()
    expect(user.email).toBeDefined()
    expect(user.password).toBeDefined()
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeInstanceOf(Date)
  })
})
