'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createProviderSchema = z.object({
  userId: z.string(),
  businessName: z.string().min(1, 'Business name is required'),
  industry: z.string().min(1, 'Industry is required'),
  address: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  timezone: z.string().default('Africa/Lagos'),
})

export async function createProvider(data: z.infer<typeof createProviderSchema>) {
  try {
    // Validate input
    const validated = createProviderSchema.parse(data)

    // Check if user already has a provider
    const existing = await prisma.provider.findUnique({
      where: { userId: validated.userId },
    })

    if (existing) {
      return { error: 'Provider profile already exists' }
    }

    // Create provider and wallet in a transaction
    const provider = await prisma.$transaction(async (tx) => {
      const newProvider = await tx.provider.create({
        data: {
          userId: validated.userId,
          businessName: validated.businessName,
          industry: validated.industry,
          address: validated.address,
          phone: validated.phone,
          email: validated.email,
          timezone: validated.timezone,
        },
      })

      // Create wallet for the provider
      await tx.wallet.create({
        data: {
          providerId: newProvider.id,
          balance: 0,
          totalEarnings: 0,
        },
      })

      return newProvider
    })

    revalidatePath('/dashboard')
    revalidatePath('/onboarding')

    return { success: true, provider }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error creating provider:', error)
    return { error: 'Failed to create provider profile' }
  }
}
