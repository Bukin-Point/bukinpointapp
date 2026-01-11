/**
 * One-time script to update existing users' onboardingCompleted status
 * Run with: npx tsx scripts/update-onboarding-status.ts
 */

import { prisma } from '../src/lib/db'

async function updateOnboardingStatus() {
  console.log('Updating onboarding status for existing users...')

  // Get all users with staff memberships
  const staffUsers = await prisma.user.findMany({
    where: {
      staffMemberships: {
        some: {},
      },
    },
    select: { id: true },
  })

  // Get all users with provider records
  const providerUsers = await prisma.user.findMany({
    where: {
      provider: {
        isNot: null,
      },
    },
    select: { id: true },
  })

  // Combine and deduplicate
  const usersToUpdate = new Set([
    ...staffUsers.map(u => u.id),
    ...providerUsers.map(u => u.id),
  ])

  console.log(`Found ${usersToUpdate.size} users to mark as onboardingCompleted=true`)

  // Update all users who have staff or provider records
  const result = await prisma.user.updateMany({
    where: {
      id: {
        in: Array.from(usersToUpdate),
      },
    },
    data: {
      onboardingCompleted: true,
    },
  })

  console.log(`Updated ${result.count} users`)
  console.log('Done!')
}

updateOnboardingStatus()
  .catch((error) => {
    console.error('Error updating onboarding status:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
