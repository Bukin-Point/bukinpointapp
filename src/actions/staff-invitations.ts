'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { sendStaffInvitationEmail } from '@/lib/email'

const sendInvitationSchema = z.object({
  providerId: z.string(),
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'STAFF', 'PROVIDER']).default('STAFF'),
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
      const existingMember = await prisma.userProvider.findFirst({
        where: {
          providerId: validated.providerId,
          userId: existingUser.id,
        },
      })

      if (existingMember) {
        return { error: 'This user is already a member of this provider' }
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

    // Default role ID handling
    let roleId: string | null = null;
    const roleName = validated.role === 'OWNER' ? 'OWNER' : 'STAFF';
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      roleId = role.id;
    }

    const invitation = await prisma.staffInvitation.create({
      data: {
        providerId: validated.providerId,
        email: validated.email,
        token,
        roleId: roleId,
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

    // Fetch role name if roleId exists
    let roleName = 'STAFF'
    if (invitation.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: invitation.roleId },
        select: { name: true },
      })
      if (role) {
        roleName = role.name
      }
    }

    return { success: true, invitation, roleName }
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
    roleId?: string | null
    serviceIds: string
  },
  userId: string
) {
  try {
    // Check if staff member already exists for this provider
    const existing = await prisma.userProvider.findFirst({
      where: {
        providerId: invitation.providerId,
        userId,
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
      return { success: true, userProvider: existing }
    }

    // Check if user is already staff for another provider
    const otherMemberships = await prisma.userProvider.findMany({
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

    if (otherMemberships.length > 0) {
      console.log(
        `User ${userId} is already member for ${otherMemberships.length} other provider(s). Proceeding with invitation acceptance.`
      )
    }

    // Parse service IDs
    const serviceIds = JSON.parse(invitation.serviceIds || '[]') as string[]

    // Validate that all services belong to this provider
    let validServiceIds: string[] = []
    if (serviceIds.length > 0) {
      const validServices = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          providerId: invitation.providerId,
        },
        select: { id: true },
      })

      validServiceIds = validServices.map((s) => s.id)
    }

    // Create user provider and assign services
    const userProvider = await prisma.$transaction(async (tx) => {

      let roleId = invitation.roleId;

      // If no roleId on invitation, check for default STAFF role
      if (!roleId) {
        const defaultRole = await tx.role.findUnique({ where: { name: 'STAFF' } });
        roleId = defaultRole?.id;
      }

      const isOwner = false; // By default invitations are for staff, unless specifically OWNER role is invited (which we should probably support but keeping safe for now)

      const newMember = await tx.userProvider.create({
        data: {
          providerId: invitation.providerId,
          userId,
          isOwner,
          isActive: true
        },
      })

      // Assign Role if found
      if (roleId) {
        await tx.userProviderRole.create({
          data: {
            userProviderId: newMember.id,
            roleId: roleId
          }
        })
      }

      // Assign services (only valid ones)
      if (validServiceIds.length > 0) {
        await tx.userProviderService.createMany({
          data: validServiceIds.map((serviceId) => ({
            userProviderId: newMember.id,
            serviceId,
          })),
          skipDuplicates: true,
        })
      }

      // Mark invitation as accepted
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      })

      return newMember
    })

    return { success: true, userProvider }
  } catch (error: any) {
    console.error('Error creating staff from invitation:', error)

    // Provide more specific error messages
    if (error?.code === 'P2002') {
      return { error: 'You are already a member of this provider' }
    }

    return { error: error?.message || 'Failed to join provider. Please contact support.' }
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

    // If already accepted, check if member exists
    if (invitation.acceptedAt) {
      const existingMember = await prisma.userProvider.findFirst({
        where: {
          providerId: invitation.providerId,
          userId,
        },
      })

      if (existingMember) {
        return { success: true, message: 'Member already exists' }
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
