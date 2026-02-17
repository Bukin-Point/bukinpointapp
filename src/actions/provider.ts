'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { generateSubdomain, generateUniqueSubdomain } from '@/lib/subdomain-utils'
import { hasPermission } from '@/lib/auth-helpers-clerk'

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
  // Validate input (outside try block so it's accessible in catch)
  let validated: z.infer<typeof createProviderSchema>
  try {
    validated = createProviderSchema.parse(data)
  } catch (parseError) {
    if (parseError instanceof z.ZodError) {
      return { error: parseError.issues[0]?.message || 'Validation error' }
    }
    throw parseError
  }

  try {

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

      // Automatically create user provider entry for the provider (as owner)
      // This allows providers to immediately accept bookings without manual setup
      const existingUserProvider = await tx.userProvider.findFirst({
        where: {
          providerId: newProvider.id,
          userId: validated.userId,
        },
      })

      if (!existingUserProvider) {
        // Create UserProvider
        const userProvider = await tx.userProvider.create({
          data: {
            providerId: newProvider.id,
            userId: validated.userId,
            isOwner: true,
            isActive: true,
          },
        })

        // Try to assign OWNER role if it exists (system role)
        const ownerRole = await tx.role.findFirst({
          where: { name: 'OWNER' },
        })

        if (ownerRole) {
          await tx.userProviderRole.create({
            data: {
              userProviderId: userProvider.id,
              roleId: ownerRole.id,
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
      return { error: error.issues[0]?.message || 'Validation error' }
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

          // Automatically create user provider entry for the provider (as owner)
          const existingUserProvider = await tx.userProvider.findFirst({
            where: {
              providerId: newProvider.id,
              userId: validated.userId,
            },
          })

          if (!existingUserProvider) {
            // Create UserProvider
            const userProvider = await tx.userProvider.create({
              data: {
                providerId: newProvider.id,
                userId: validated.userId,
                isOwner: true,
                isActive: true,
              },
            })

            // Try to assign OWNER role if it exists (system role)
            const ownerRole = await tx.role.findFirst({
              where: { name: 'OWNER' },
            })

            if (ownerRole) {
              await tx.userProviderRole.create({
                data: {
                  userProviderId: userProvider.id,
                  roleId: ownerRole.id,
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
  businessImage: z.union([
    z.string().url('Invalid image URL'),
    z.literal(''),
    z.null(),
  ]).optional(),
})

export async function updateProvider(
  providerId: string,
  data: z.infer<typeof updateProviderSchema>
) {
  try {
    // Validate input
    const validated = updateProviderSchema.parse(data)

    // Authorization check
    if (!(await hasPermission(providerId, 'manage:settings'))) {
      return { error: 'Unauthorized: You do not have permission to manage business settings.' }
    }

    // Check if provider exists
    const existing = await prisma.provider.findUnique({
      where: { id: providerId },
    })

    if (!existing) {
      return { error: 'Provider profile not found' }
    }

    // Prepare update data
    const updateData: any = {}

    if (validated.businessName) {
      updateData.businessName = validated.businessName
    }
    if (validated.industry) {
      updateData.industry = validated.industry
    }
    if (validated.address !== undefined) {
      updateData.address = validated.address
    }
    if (validated.phone) {
      updateData.phone = validated.phone
    }
    if (validated.email) {
      updateData.email = validated.email
    }
    if (validated.timezone) {
      updateData.timezone = validated.timezone
    }
    // Handle businessImage - explicitly set to null if empty string, or keep the URL
    if (validated.businessImage !== undefined) {
      updateData.businessImage = validated.businessImage && validated.businessImage.trim() !== ''
        ? validated.businessImage.trim()
        : null
    }

    // Update provider
    const provider = await prisma.provider.update({
      where: { id: providerId },
      data: updateData,
    })

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return { success: true, provider }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error updating provider:', error)
    return { error: 'Failed to update provider profile' }
  }
}
