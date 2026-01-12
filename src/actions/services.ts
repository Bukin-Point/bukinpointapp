'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { deleteImage } from '@/lib/upload'

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  image: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes'),
  price: z.number().min(0, 'Price must be positive'),
  isActive: z.boolean().default(true),
})

const createServiceSchema = serviceSchema.extend({
  providerId: z.string(),
})

const updateServiceSchema = serviceSchema.partial().extend({
  id: z.string(),
})

export async function createService(data: z.infer<typeof createServiceSchema>) {
  try {
    const validated = createServiceSchema.parse(data)

    // Verify provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: validated.providerId },
    })

    if (!provider) {
      return { error: 'Provider not found' }
    }

    // Create service and auto-assign to provider's staff member in a transaction
    const service = await prisma.$transaction(async (tx) => {
      const newService = await tx.service.create({
        data: {
          providerId: validated.providerId,
          name: validated.name,
          description: validated.description,
          image: validated.image && validated.image.trim() !== '' ? validated.image : null,
          duration: validated.duration,
          price: validated.price,
          isActive: validated.isActive,
        },
      })

      // Find provider's staff member (the provider themselves)
      const providerStaff = await tx.staffMember.findUnique({
        where: {
          providerId_userId: {
            providerId: validated.providerId,
            userId: provider.userId,
          },
        },
      })

      // Auto-assign service to provider's staff member if they exist
      if (providerStaff) {
        await tx.staffService.createMany({
          data: [
            {
              staffId: providerStaff.id,
              serviceId: newService.id,
            },
          ],
          skipDuplicates: true, // Skip if already assigned
        })
      }

      return newService
    })

    revalidatePath('/services')
    return { success: true, service }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error creating service:', error)
    return { error: 'Failed to create service' }
  }
}

export async function updateService(
  id: string,
  data: z.infer<typeof updateServiceSchema>
) {
  try {
    const validated = updateServiceSchema.parse({ ...data, id })

    // Get current service to check for old image
    const currentService = await prisma.service.findUnique({
      where: { id },
      select: { image: true },
    })

    const newImageUrl = validated.image && validated.image.trim() !== '' ? validated.image : null

    // Delete old image if it's being replaced and is from R2
    if (currentService?.image && newImageUrl && currentService.image !== newImageUrl) {
      // Old image exists and is being replaced
      try {
        await deleteImage(currentService.image)
      } catch (error) {
        // Log error but don't fail the update
        console.error('Failed to delete old image:', error)
      }
    }

    // Also delete if image is being removed (set to null)
    if (currentService?.image && !newImageUrl) {
      try {
        await deleteImage(currentService.image)
      } catch (error) {
        // Log error but don't fail the update
        console.error('Failed to delete old image:', error)
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        image: newImageUrl,
        duration: validated.duration,
        price: validated.price,
        isActive: validated.isActive,
      },
    })

    revalidatePath('/services')
    return { success: true, service }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error updating service:', error)
    return { error: 'Failed to update service' }
  }
}

export async function deleteService(id: string) {
  try {
    // Get service to check for image before deleting
    const service = await prisma.service.findUnique({
      where: { id },
      select: { image: true },
    })

    // Delete the service
    await prisma.service.delete({
      where: { id },
    })

    // Delete associated image from R2 if it exists
    if (service?.image) {
      try {
        await deleteImage(service.image)
      } catch (error) {
        // Log error but don't fail the deletion
        console.error('Failed to delete service image:', error)
      }
    }

    revalidatePath('/services')
    return { success: true }
  } catch (error) {
    console.error('Error deleting service:', error)
    return { error: 'Failed to delete service' }
  }
}
