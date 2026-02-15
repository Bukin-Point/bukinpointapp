'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const availabilitySchema = z.object({
  providerId: z.string(),
  userProviderId: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  isBlocked: z.boolean().default(false),
  blockedDate: z.date().optional(),
})

export async function createAvailability(data: z.infer<typeof availabilitySchema>) {
  try {
    const validated = availabilitySchema.parse(data)

    // Validate time range
    if (validated.startTime >= validated.endTime) {
      return { error: 'End time must be after start time' }
    }

    // Check for conflicts
    const conflicts = await prisma.availability.findMany({
      where: {
        userProviderId: validated.userProviderId,
        dayOfWeek: validated.dayOfWeek,
        isBlocked: false,
        OR: [
          {
            AND: [
              { startTime: { lte: validated.startTime } },
              { endTime: { gt: validated.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: validated.endTime } },
              { endTime: { gte: validated.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: validated.startTime } },
              { endTime: { lte: validated.endTime } },
            ],
          },
        ],
      },
    })

    if (conflicts.length > 0) {
      return { error: 'This time slot conflicts with existing availability' }
    }

    const availability = await prisma.availability.create({
      data: {
        providerId: validated.providerId,
        userProviderId: validated.userProviderId,
        dayOfWeek: validated.dayOfWeek,
        startTime: validated.startTime,
        endTime: validated.endTime,
        isBlocked: validated.isBlocked,
        blockedDate: validated.blockedDate,
      },
    })

    revalidatePath('/availability')
    return { success: true, availability }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error creating availability:', error)
    return { error: 'Failed to create availability' }
  }
}

export async function deleteAvailability(id: string) {
  try {
    await prisma.availability.delete({
      where: { id },
    })

    revalidatePath('/availability')
    return { success: true }
  } catch (error) {
    console.error('Error deleting availability:', error)
    return { error: 'Failed to delete availability' }
  }
}

export async function blockDate(userProviderId: string, date: Date) {
  try {
    // Create a blocked availability entry for the specific date
    const dayOfWeek = date.getDay()

    // Get provider ID from userProvider
    const userProvider = await prisma.userProvider.findUnique({
      where: { id: userProviderId },
      select: { providerId: true }
    })

    if (!userProvider) {
      return { error: 'User provider not found' }
    }

    const availability = await prisma.availability.create({
      data: {
        userProviderId,
        providerId: userProvider.providerId,
        dayOfWeek,
        startTime: '00:00',
        endTime: '23:59',
        isBlocked: true,
        blockedDate: date,
      },
    })

    revalidatePath('/availability')
    return { success: true, availability }
  } catch (error) {
    console.error('Error blocking date:', error)
    return { error: 'Failed to block date' }
  }
}

const bulkAvailabilitySchema = z.object({
  providerId: z.string(),
  userProviderId: z.string(),
  days: z.array(z.number().int().min(0).max(6)),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  isBlocked: z.boolean().default(false),
})

export async function createBulkAvailability(data: z.infer<typeof bulkAvailabilitySchema>) {
  try {
    const validated = bulkAvailabilitySchema.parse(data)

    // Validate time range
    if (validated.startTime >= validated.endTime) {
      return { error: 'End time must be after start time' }
    }

    if (validated.days.length === 0) {
      return { error: 'At least one day must be selected' }
    }

    // Check for conflicts for all days
    const allConflicts = await prisma.availability.findMany({
      where: {
        userProviderId: validated.userProviderId,
        dayOfWeek: { in: validated.days },
        isBlocked: false,
        OR: [
          {
            AND: [
              { startTime: { lte: validated.startTime } },
              { endTime: { gt: validated.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: validated.endTime } },
              { endTime: { gte: validated.endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: validated.startTime } },
              { endTime: { lte: validated.endTime } },
            ],
          },
        ],
      },
    })

    if (allConflicts.length > 0) {
      const conflictDays = [...new Set(allConflicts.map((c) => c.dayOfWeek))]
      const dayLabels = conflictDays.map((d) => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return dayNames[d]
      })
      return { error: `Conflicts detected on: ${dayLabels.join(', ')}. Please resolve conflicts first.` }
    }

    // Create availability for each selected day
    const availabilityEntries = validated.days.map((dayOfWeek) => ({
      providerId: validated.providerId,
      userProviderId: validated.userProviderId,
      dayOfWeek,
      startTime: validated.startTime,
      endTime: validated.endTime,
      isBlocked: validated.isBlocked,
    }))

    // Use transaction to create all at once
    const result = await prisma.$transaction(
      availabilityEntries.map((entry) =>
        prisma.availability.create({
          data: entry,
        })
      )
    )

    revalidatePath('/availability')
    return { success: true, availability: result, count: result.length }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error creating bulk availability:', error)
    return { error: 'Failed to create availability' }
  }
}
