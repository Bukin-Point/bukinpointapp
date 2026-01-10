'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createStaffSchema = z.object({
  providerId: z.string(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
  serviceIds: z.array(z.string()).default([]),
})

const updateStaffSchema = z.object({
  role: z.enum(['OWNER', 'STAFF']).optional(),
  serviceIds: z.array(z.string()).optional(),
})

export async function createStaff(data: z.infer<typeof createStaffSchema>) {
  try {
    const validated = createStaffSchema.parse(data)

    // Find or create user by email
    let user = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (!user) {
      // User doesn't exist yet - they'll need to sign up
      // For now, we'll create a placeholder user
      // In production, you might want to send an invitation email instead
      return {
        error:
          'User with this email does not exist. They need to sign up first, or you can invite them via email.',
      }
    }

    // Check if staff member already exists
    const existing = await prisma.staffMember.findUnique({
      where: {
        providerId_userId: {
          providerId: validated.providerId,
          userId: user.id,
        },
      },
    })

    if (existing) {
      return { error: 'This user is already a staff member' }
    }

    // Create staff member and assign services
    const staffMember = await prisma.$transaction(async (tx) => {
      const newStaff = await tx.staffMember.create({
        data: {
          providerId: validated.providerId,
          userId: user!.id,
          role: validated.role,
        },
      })

      // Assign services
      if (validated.serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: validated.serviceIds.map((serviceId) => ({
            staffId: newStaff.id,
            serviceId,
          })),
        })
      }

      return newStaff
    })

    revalidatePath('/staff')
    return { success: true, staffMember }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error creating staff:', error)
    return { error: 'Failed to create staff member' }
  }
}

export async function updateStaff(
  id: string,
  data: z.infer<typeof updateStaffSchema>
) {
  try {
    const validated = updateStaffSchema.parse(data)

    await prisma.$transaction(async (tx) => {
      // Update staff member
      if (validated.role !== undefined) {
        await tx.staffMember.update({
          where: { id },
          data: { role: validated.role },
        })
      }

      // Update service assignments
      if (validated.serviceIds !== undefined) {
        // Remove existing assignments
        await tx.staffService.deleteMany({
          where: { staffId: id },
        })

        // Add new assignments
        if (validated.serviceIds.length > 0) {
          await tx.staffService.createMany({
            data: validated.serviceIds.map((serviceId) => ({
              staffId: id,
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
      return { error: error.errors[0].message }
    }
    console.error('Error updating staff:', error)
    return { error: 'Failed to update staff member' }
  }
}

export async function deleteStaff(id: string) {
  try {
    await prisma.staffMember.delete({
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
    await prisma.staffMember.update({
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
