'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendStaffInvitationEmail } from '@/lib/email'

const sendInvitationSchema = z.object({
  providerId: z.string(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
  serviceIds: z.array(z.string()).default([]),
})

const acceptInvitationSchema = z.object({
  token: z.string(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function sendStaffInvitation(data: z.infer<typeof sendInvitationSchema>) {
  try {
    const validated = sendInvitationSchema.parse(data)

    // Check if provider is trying to invite themselves
    const provider = await prisma.provider.findUnique({
      where: { id: validated.providerId },
      include: { user: true },
    })

    if (provider && provider.user.email === validated.email) {
      return { error: 'You cannot invite yourself as staff. You are already the provider.' }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      // Check if they're already a staff member
      const existingStaff = await prisma.staffMember.findUnique({
        where: {
          providerId_userId: {
            providerId: validated.providerId,
            userId: existingUser.id,
          },
        },
      })

      if (existingStaff) {
        return { error: 'This user is already a staff member' }
      }
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await prisma.staffInvitation.findFirst({
      where: {
        providerId: validated.providerId,
        email: validated.email,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return { error: 'An invitation has already been sent to this email' }
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex')

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.staffInvitation.create({
      data: {
        providerId: validated.providerId,
        email: validated.email,
        token,
        role: validated.role,
        serviceIds: JSON.stringify(validated.serviceIds),
        expiresAt,
      },
      include: {
        provider: {
          select: {
            businessName: true,
          },
        },
      },
    })

    // Send invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup/staff?token=${token}`
    
    const emailResult = await sendStaffInvitationEmail({
      email: validated.email,
      businessName: invitation.provider.businessName,
      role: validated.role,
      invitationUrl,
    })

    // Log email result (success or failure)
    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error)
      // Still return success since invitation is created
      // In production, you might want to handle this differently (e.g., queue for retry)
    }

    revalidatePath('/staff')
    const isDevelopment = process.env.NODE_ENV === 'development'
    return { 
      success: true, 
      invitation, 
      invitationUrl,
      emailSent: emailResult.success,
      emailError: emailResult.error,
      isDevelopment
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error sending staff invitation:', error)
    return { error: 'Failed to send staff invitation' }
  }
}

export async function getInvitationByToken(token: string) {
  try {
    const invitation = await prisma.staffInvitation.findUnique({
      where: { token },
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            industry: true,
          },
        },
      },
    })

    if (!invitation) {
      return { error: 'Invitation not found' }
    }

    if (invitation.acceptedAt) {
      return { error: 'This invitation has already been accepted' }
    }

    if (invitation.expiresAt < new Date()) {
      return { error: 'This invitation has expired' }
    }

    return { success: true, invitation }
  } catch (error) {
    console.error('Error getting invitation:', error)
    return { error: 'Failed to validate invitation' }
  }
}

export async function acceptInvitation(data: z.infer<typeof acceptInvitationSchema>) {
  try {
    const validated = acceptInvitationSchema.parse(data)

    // Get invitation
    const invitationResult = await getInvitationByToken(validated.token)
    if (invitationResult.error || !invitationResult.success) {
      return { error: invitationResult.error || 'Invalid invitation' }
    }

    const invitation = invitationResult.invitation!

    // Verify email matches
    if (invitation.email !== validated.email) {
      return { error: 'Email does not match invitation' }
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (!user) {
      // User will be created by Better Auth during signup
      // We'll link the staff member after signup
      return {
        error: null,
        requiresSignup: true,
        invitation: invitationResult.invitation,
      }
    }

    // User exists, create staff member and accept invitation
    return await createStaffFromInvitation(invitation, user.id)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || 'Validation error' }
    }
    console.error('Error accepting invitation:', error)
    return { error: 'Failed to accept invitation' }
  }
}

export async function createStaffFromInvitation(
  invitation: {
    id: string
    providerId: string
    role: 'OWNER' | 'STAFF'
    serviceIds: string
  },
  userId: string
) {
  try {
    // Check if staff member already exists for this provider
    const existing = await prisma.staffMember.findUnique({
      where: {
        providerId_userId: {
          providerId: invitation.providerId,
          userId,
        },
      },
    })

    if (existing) {
      // Mark invitation as accepted anyway if not already accepted
      await prisma.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      })
      // Return success since staff member already exists
      revalidatePath('/staff')
      revalidatePath('/dashboard')
      revalidatePath('/onboarding')
      return { success: true, staffMember: existing }
    }

    // Check if user is already staff for another provider
    const otherStaffMemberships = await prisma.staffMember.findMany({
      where: {
        userId,
        providerId: { not: invitation.providerId },
      },
      include: {
        provider: {
          select: {
            businessName: true,
          },
        },
      },
    })

    if (otherStaffMemberships.length > 0) {
      // User is already staff for another provider - this is allowed, but we'll log it
      console.log(
        `User ${userId} is already staff for ${otherStaffMemberships.length} other provider(s). Proceeding with invitation acceptance.`
      )
    }

    // Parse service IDs
    const serviceIds = JSON.parse(invitation.serviceIds || '[]') as string[]

    // Validate that all services belong to this provider
    if (serviceIds.length > 0) {
      const validServices = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          providerId: invitation.providerId,
        },
        select: { id: true },
      })

      const validServiceIds = validServices.map((s) => s.id)
      const invalidServiceIds = serviceIds.filter((id) => !validServiceIds.includes(id))

      if (invalidServiceIds.length > 0) {
        console.warn(
          `Some service IDs in invitation do not belong to provider ${invitation.providerId}:`,
          invalidServiceIds
        )
        // Filter out invalid service IDs
        const filteredServiceIds = serviceIds.filter((id) => validServiceIds.includes(id))
        serviceIds.length = 0
        serviceIds.push(...filteredServiceIds)
      }
    }

    // Create staff member and assign services
    const staffMember = await prisma.$transaction(async (tx) => {
      const newStaff = await tx.staffMember.create({
        data: {
          providerId: invitation.providerId,
          userId,
          role: invitation.role,
        },
      })

      // Assign services (only valid ones)
      if (serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: serviceIds.map((serviceId) => ({
            staffId: newStaff.id,
            serviceId,
          })),
          skipDuplicates: true, // Skip if already exists
        })
      }

      // Mark invitation as accepted
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      })

      return newStaff
    })

    // Note: revalidatePath removed - cannot be called during render.
    // Pages will be revalidated on next request after redirect.
    return { success: true, staffMember }
  } catch (error: any) {
    console.error('Error creating staff from invitation:', error)
    
    // Provide more specific error messages
    if (error?.code === 'P2002') {
      // Unique constraint violation
      return { error: 'You are already a staff member for this provider' }
    }
    
    if (error?.code === 'P2003') {
      // Foreign key constraint violation
      return { error: 'Invalid provider or service reference. Please contact support.' }
    }

    // Log the full error for debugging
    console.error('Full error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    })

    return { error: error?.message || 'Failed to create staff member. Please contact support if this issue persists.' }
  }
}

export async function getPendingInvitations(providerId: string) {
  try {
    const invitations = await prisma.staffInvitation.findMany({
      where: {
        providerId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, invitations }
  } catch (error) {
    console.error('Error getting pending invitations:', error)
    return { error: 'Failed to get pending invitations', invitations: [] }
  }
}

export async function cancelInvitation(invitationId: string) {
  try {
    await prisma.staffInvitation.delete({
      where: { id: invitationId },
    })

    revalidatePath('/staff')
    revalidatePath('/dashboard')
    revalidatePath('/onboarding')
    return { success: true }
  } catch (error) {
    console.error('Error canceling invitation:', error)
    return { error: 'Failed to cancel invitation' }
  }
}

/**
 * Check and accept any pending invitations for a user by email
 * This is called after login to automatically accept invitations
 */
export async function checkAndAcceptPendingInvitations(userId: string, email: string) {
  try {
    // Find pending or accepted invitations for this email
    const invitation = await prisma.staffInvitation.findFirst({
      where: {
        email,
        expiresAt: { gt: new Date() }, // Not expired
      },
      orderBy: { createdAt: 'desc' }, // Get most recent
    })

    if (!invitation) {
      return { success: false, message: 'No pending invitation found' }
    }

    // If already accepted, check if staff member exists
    if (invitation.acceptedAt) {
      const existingStaff = await prisma.staffMember.findUnique({
        where: {
          providerId_userId: {
            providerId: invitation.providerId,
            userId,
          },
        },
      })

      if (existingStaff) {
        return { success: true, message: 'Staff member already exists' }
      }
    }

    // Accept the invitation
    const result = await acceptInvitationAfterSignup(invitation.token, userId)
    return result
  } catch (error) {
    console.error('Error checking pending invitations:', error)
    return { error: 'Failed to check pending invitations' }
  }
}

export async function acceptInvitationAfterSignup(token: string, userId: string) {
  try {
    // Get invitation
    const invitationResult = await getInvitationByToken(token)
    if (invitationResult.error || !invitationResult.success) {
      return { error: invitationResult.error || 'Invalid invitation' }
    }

    const invitation = invitationResult.invitation!

    // Get user to verify email matches
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { error: 'User not found' }
    }

    if (user.email !== invitation.email) {
      return { error: 'Email does not match invitation' }
    }

    // Create staff member from invitation
    const result = await createStaffFromInvitation(invitation, userId)
    return result
  } catch (error) {
    console.error('Error accepting invitation after signup:', error)
    return { error: 'Failed to accept invitation' }
  }
}
