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

    // Check if email belongs to any provider (business owner)
    const existingProvider = await prisma.provider.findFirst({
      where: {
        user: {
          email: validated.email,
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    if (existingProvider) {
      return { error: 'This email address belongs to a business owner. Business owners cannot be invited as staff members.' }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      // Check if they're already a staff member for ANY provider
      const existingStaff = await prisma.staffMember.findFirst({
        where: {
          userId: existingUser.id,
        },
      })

      if (existingStaff) {
        return { error: 'This user is already a staff member for another provider. Each user can only be associated with one provider.' }
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

    // Create invitation record in database (expires in 7 days)
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

    // Send invitation email with Clerk's invitation URL
    // Clerk sends its own email, but we can send a custom one too
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
      // Still return success since Clerk invitation is created
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
      return { error: error.errors[0].message }
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
      return { error: error.errors[0].message }
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
      // Note: revalidatePath removed to avoid render-time errors
      // Pages will refresh naturally when user navigates
      return { success: true, staffMember: existing }
    }

    // Check if user is already staff for another provider (should not happen with unique constraint, but check anyway)
    const existingStaffMembership = await prisma.staffMember.findFirst({
      where: {
        userId,
        providerId: { not: invitation.providerId },
      },
    })

    if (existingStaffMembership) {
      return { 
        error: 'You are already a staff member for another provider. Each user can only be associated with one provider.' 
      }
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

      // Mark user as having completed onboarding (staff don't need onboarding)
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
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

    // Note: revalidatePath is called outside the transaction to avoid render-time issues
    // We'll revalidate in a separate call if needed, but for now we skip it during onboarding
    // The pages will refresh naturally when the user navigates
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
 * Processes ALL pending invitations (not just the first one)
 */
export async function checkAndAcceptPendingInvitations(userId: string, email: string) {
  try {
    // Check if user already has a staff membership
    const existingStaff = await prisma.staffMember.findFirst({
      where: { userId },
    })

    if (existingStaff) {
      return { 
        success: false, 
        message: 'User already has a staff membership. Cannot accept additional invitations.' 
      }
    }

    // Find the first pending invitation for this email
    const invitation = await prisma.staffInvitation.findFirst({
      where: {
        email,
        expiresAt: { gt: new Date() }, // Not expired
        acceptedAt: null,
      },
      orderBy: { createdAt: 'desc' }, // Get most recent first
    })

    if (!invitation) {
      return { success: false, message: 'No pending invitation found' }
    }

    // Accept the invitation
    const result = await acceptInvitationAfterSignup(invitation.token, userId)
    
    if (result.staffMember || result.success) {
      return { 
        success: true, 
        message: 'Invitation accepted successfully',
        processedCount: 1,
        totalCount: 1
      }
    }

    return { 
      success: false, 
      error: result.error || 'Failed to accept invitation',
      processedCount: 0,
      totalCount: 1
    }
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
      select: { id: true, email: true, clerkUserId: true },
    })

    if (!user) {
      return { error: 'User not found' }
    }

    // Get Clerk user to check all email addresses
    let clerkEmails: string[] = []
    if (user.clerkUserId) {
      try {
        const { clerkClient } = await import('@clerk/clerk-sdk-node')
        const clerkUser = await clerkClient.users.getUser(user.clerkUserId)
        clerkEmails = clerkUser.emailAddresses.map(e => e.emailAddress.toLowerCase().trim())
      } catch (error) {
        console.warn('Could not fetch Clerk user emails:', error)
      }
    }

    // Case-insensitive email comparison
    const userEmailLower = user.email.toLowerCase().trim()
    const invitationEmailLower = invitation.email.toLowerCase().trim()
    
    // Check if invitation email matches user email or any of their Clerk email addresses
    const emailMatches = 
      userEmailLower === invitationEmailLower ||
      clerkEmails.includes(invitationEmailLower)
    
    if (!emailMatches) {
      console.error('Email mismatch:', {
        invitationEmail: invitation.email,
        userEmail: user.email,
        clerkEmails,
        invitationEmailLower,
        userEmailLower,
        userId,
        clerkUserId: user.clerkUserId,
        invitationId: invitation.id,
      })
      return { 
        error: `Email does not match invitation. The invitation was sent to "${invitation.email}", but your account is registered with "${user.email}". Please sign up or sign in using the email address that received the invitation.` 
      }
    }

    // Create staff member from invitation
    const result = await createStaffFromInvitation(invitation, userId)
    
    return result
  } catch (error) {
    console.error('Error accepting invitation after signup:', error)
    return { error: 'Failed to accept invitation' }
  }
}
