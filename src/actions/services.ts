'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
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

    const service = await prisma.service.create({
      data: {
        providerId: validated.providerId,
        name: validated.name,
        description: validated.description,
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

    const service = await prisma.service.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
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
    await prisma.service.delete({
      where: { id },
    })

    revalidatePath('/services')
    return { success: true }
  } catch (error) {
    console.error('Error deleting service:', error)
    return { error: 'Failed to delete service' }
  }
}
