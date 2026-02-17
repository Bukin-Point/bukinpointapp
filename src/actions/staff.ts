'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { hasPermission } from '@/lib/auth-helpers-clerk'

const createStaffSchema = z.object({
  providerId: z.string(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'STAFF', 'PROVIDER']).default('STAFF'),
  serviceIds: z.array(z.string()).default([]),
})

const updateStaffSchema = z.object({
  role: z.enum(['OWNER', 'STAFF', 'PROVIDER']).optional(),
  serviceIds: z.array(z.string()).optional(),
})

export async function createStaff(data: z.infer<typeof createStaffSchema>) {
  try {
    const validated = createStaffSchema.parse(data)

    // Authorization check
    if (!(await hasPermission(validated.providerId, 'manage:users'))) {
      return { error: 'Unauthorized: You do not have permission to manage staff.' }
    }

    // Find or create user by email
    let user = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (!user) {
      // User doesn't exist yet - they'll need to sign up
      // For now, we'll create a placeholder user or return error
      return {
        error:
          'User with this email does not exist. They need to sign up first, or you can invite them via email.',
      }
    }

    // Check if user provider relationship already exists
    const existing = await prisma.userProvider.findFirst({
      where: {
        providerId: validated.providerId,
        userId: user.id,
      },
      include: {
        provider: { select: { status: true } }
      }
    })

    if (existing) {
      if (existing.provider.status !== 'ACTIVE') {
        return { error: 'This provider account is not active.' }
      }
      return { error: 'This user is already a member of this provider.' }
    }

    // Determine role name
    const roleName = validated.role === 'OWNER' ? 'OWNER' : 'STAFF';

    // Get role ID
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    })

    if (!role) {
      // If system roles are missing, this is a critical config error
      return { error: `System role '${roleName}' not found.` }
    }

    // Create UserProvider and assign role & services
    const userProvider = await prisma.$transaction(async (tx) => {
      // Create UserProvider
      const newUp = await tx.userProvider.create({
        data: {
          providerId: validated.providerId,
          userId: user!.id,
          isOwner: roleName === 'OWNER',
          isActive: true,
        },
      })

      // Assign Role
      await tx.userProviderRole.create({
        data: {
          userProviderId: newUp.id,
          roleId: role.id,
        },
      })

      // Assign Services
      if (validated.serviceIds.length > 0) {
        await tx.userProviderService.createMany({
          data: validated.serviceIds.map((serviceId) => ({
            userProviderId: newUp.id,
            serviceId,
          })),
        })
      }

      return newUp
    })

    revalidatePath('/staff')
    return { success: true, userProvider }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error creating staff:', error)
    return { error: 'Failed to create staff member' }
  }
}

export async function updateStaff(
  id: string, // This is userProviderId
  data: z.infer<typeof updateStaffSchema>
) {
  try {
    const validated = updateStaffSchema.parse(data)

    // Authorization check - First, get the providerId for this userProvider record
    const userProvider = await prisma.userProvider.findUnique({
      where: { id },
      select: { providerId: true }
    })

    if (!userProvider || !(await hasPermission(userProvider.providerId, 'manage:users'))) {
      return { error: 'Unauthorized: You do not have permission to manage staff.' }
    }

    await prisma.$transaction(async (tx) => {
      // Update role if changed
      if (validated.role !== undefined) {
        const roleName = validated.role === 'OWNER' ? 'OWNER' : 'STAFF';

        // Update isOwner flag
        await tx.userProvider.update({
          where: { id },
          data: { isOwner: roleName === 'OWNER' },
        })

        // Fetch the new role object
        const newRole = await tx.role.findUnique({
          where: { name: roleName },
        })

        if (!newRole) {
          throw new Error(`Role ${roleName} not found`)
        }

        // We need to update the UserProviderRole.
        // First, check existing roles. We assume one primary role for now.
        // Delete existing roles for this userProvider
        await tx.userProviderRole.deleteMany({
          where: { userProviderId: id },
        })

        // Create new role assignment
        await tx.userProviderRole.create({
          data: {
            userProviderId: id,
            roleId: newRole.id,
          },
        })
      }

      // Update service assignments
      if (validated.serviceIds !== undefined) {
        // Remove existing assignments
        await tx.userProviderService.deleteMany({
          where: { userProviderId: id },
        })

        // Add new assignments
        if (validated.serviceIds.length > 0) {
          await tx.userProviderService.createMany({
            data: validated.serviceIds.map((serviceId) => ({
              userProviderId: id,
              serviceId,
            })),
          })
        }
      }
    })

    revalidatePath('/staff')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error updating staff:', error)
    return { error: 'Failed to update staff member' }
  }
}

export async function deleteStaff(id: string) {
  try {
    const userProvider = await prisma.userProvider.findUnique({
      where: { id },
      select: { providerId: true }
    })

    if (!userProvider || !(await hasPermission(userProvider.providerId, 'manage:users'))) {
      return { error: 'Unauthorized: You do not have permission to manage staff.' }
    }

    await prisma.userProvider.delete({
      where: { id },
    })

    revalidatePath('/staff')
    return { success: true }
  } catch (error) {
    console.error('Error deleting staff:', error)
    return { error: 'Failed to delete staff member' }
  }
}

export async function toggleStaffStatus(id: string, isActive: boolean) {
  try {
    const userProvider = await prisma.userProvider.findUnique({
      where: { id },
      select: { providerId: true }
    })

    if (!userProvider || !(await hasPermission(userProvider.providerId, 'manage:users'))) {
      return { error: 'Unauthorized: You do not have permission to manage staff.' }
    }

    await prisma.userProvider.update({
      where: { id },
      data: { isActive },
    })

    revalidatePath('/staff')
    return { success: true }
  } catch (error) {
    console.error('Error toggling staff status:', error)
    return { error: 'Failed to update staff status' }
  }
}
