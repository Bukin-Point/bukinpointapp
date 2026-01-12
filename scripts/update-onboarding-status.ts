/**
 * One-time script to update existing users' onboardingCompleted status
 * NOTE: This script is deprecated - onboardingCompleted field was removed from User model
 * Run with: npx tsx scripts/update-onboarding-status.ts
 */

import { prisma } from '../src/lib/db'

async function updateOnboardingStatus() {
  console.log('This script is deprecated - onboardingCompleted field no longer exists in the User model.')
  console.log('Onboarding status is now tracked via Provider.onboardingCompleted instead.')
  console.log('No action needed.')
}

updateOnboardingStatus()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
