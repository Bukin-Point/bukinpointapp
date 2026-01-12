'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { generateSubdomain, generateUniqueSubdomain } from '@/lib/subdomain-utils'

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

    // Generate unique subdomain from business name
    const baseSubdomain = generateSubdomain(validated.businessName)

    // Ensure subdomain is unique
    const subdomain = await generateUniqueSubdomain(
      baseSubdomain,
      async (subdomain) => {
        const exists = await prisma.provider.findUnique({
          where: { subdomain },
        })
        return !!exists
      }
    )

    // Create provider, wallet, and staff member in a transaction
    const provider = await prisma.$transaction(async (tx) => {
      const newProvider = await tx.provider.create({
        data: {
          userId: validated.userId,
          businessName: validated.businessName,
          subdomain,
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

      // Automatically create staff member for the provider (for small businesses)
      // This allows providers to immediately accept bookings without manual setup
      // Check if staff member already exists (idempotent)
      const existingStaff = await tx.staffMember.findUnique({
        where: {
          providerId_userId: {
            providerId: newProvider.id,
            userId: validated.userId,
          },
        },
      })

      if (!existingStaff) {
        // Check if user is already staff for another provider (constraint check)
        const existingStaffForOtherProvider = await tx.staffMember.findFirst({
          where: {
            userId: validated.userId,
            providerId: { not: newProvider.id },
          },
        })

        if (existingStaffForOtherProvider) {
          // User is already staff for another provider - skip auto-creation
          // This is allowed (user can be provider for one business and staff for another)
          // But we won't auto-create staff member in this case
        } else {
          // Create staff member for the provider
          await tx.staffMember.create({
            data: {
              providerId: newProvider.id,
              userId: validated.userId,
              role: 'OWNER',
              isActive: true,
            },
          })
        }
      }

      return newProvider
    })

    revalidatePath('/dashboard')
    revalidatePath('/onboarding')

    return { success: true, provider, subdomain }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }

    // Handle unique constraint violation for subdomain
    if (
      error instanceof Error &&
      (error.message.includes('Unique constraint') ||
        error.message.includes('duplicate key'))
    ) {
      // Retry with timestamp suffix as fallback
      const baseSubdomain = generateSubdomain(validated.businessName)
      const fallbackSubdomain = `${baseSubdomain.substring(0, 50)}-${Date.now().toString().slice(-6)}`

      try {
        const provider = await prisma.$transaction(async (tx) => {
          const newProvider = await tx.provider.create({
            data: {
              userId: validated.userId,
              businessName: validated.businessName,
              subdomain: fallbackSubdomain,
              industry: validated.industry,
              address: validated.address,
              phone: validated.phone,
              email: validated.email,
              timezone: validated.timezone,
            },
          })

          await tx.wallet.create({
            data: {
              providerId: newProvider.id,
              balance: 0,
              totalEarnings: 0,
            },
          })

          // Automatically create staff member for the provider (for small businesses)
          // This allows providers to immediately accept bookings without manual setup
          // Check if staff member already exists (idempotent)
          const existingStaff = await tx.staffMember.findUnique({
            where: {
              providerId_userId: {
                providerId: newProvider.id,
                userId: validated.userId,
              },
            },
          })

          if (!existingStaff) {
            // Check if user is already staff for another provider (constraint check)
            const existingStaffForOtherProvider = await tx.staffMember.findFirst({
              where: {
                userId: validated.userId,
                providerId: { not: newProvider.id },
              },
            })

            if (existingStaffForOtherProvider) {
              // User is already staff for another provider - skip auto-creation
              // This is allowed (user can be provider for one business and staff for another)
              // But we won't auto-create staff member in this case
            } else {
              // Create staff member for the provider
              await tx.staffMember.create({
                data: {
                  providerId: newProvider.id,
                  userId: validated.userId,
                  role: 'OWNER',
                  isActive: true,
                },
              })
            }
          }

          return newProvider
        })

        revalidatePath('/dashboard')
        revalidatePath('/onboarding')

        return { success: true, provider, subdomain: fallbackSubdomain }
      } catch (retryError) {
        console.error('Error creating provider with fallback subdomain:', retryError)
        return { error: 'Failed to create provider profile' }
      }
    }

    console.error('Error creating provider:', error)
    return { error: 'Failed to create provider profile' }
  }
}

const updateProviderSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').optional(),
  industry: z.string().min(1, 'Industry is required').optional(),
  address: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  timezone: z.string().optional(),
})

export async function updateProvider(
  providerId: string,
  data: z.infer<typeof updateProviderSchema>
) {
  try {
    // Validate input
    const validated = updateProviderSchema.parse(data)

    // Check if provider exists
    const existing = await prisma.provider.findUnique({
      where: { id: providerId },
    })

    if (!existing) {
      return { error: 'Provider profile not found' }
    }

    // Update provider
    const provider = await prisma.provider.update({
      where: { id: providerId },
      data: {
        ...(validated.businessName && { businessName: validated.businessName }),
        ...(validated.industry && { industry: validated.industry }),
        ...(validated.address !== undefined && { address: validated.address }),
        ...(validated.phone && { phone: validated.phone }),
        ...(validated.email && { email: validated.email }),
        ...(validated.timezone && { timezone: validated.timezone }),
      },
    })

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return { success: true, provider }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error updating provider:', error)
    return { error: 'Failed to update provider profile' }
  }
}
