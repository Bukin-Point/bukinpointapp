import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET not set')
  }

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: any

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id!,
      'svix-timestamp': svix_timestamp!,
      'svix-signature': svix_signature!,
    })
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Webhook verification failed', { status: 400 })
  }

  const eventType = evt.type
  const { id: userId, email_addresses, public_metadata } = evt.data

  // Handle user.created event - set account type metadata
  if (eventType === 'user.created') {
    try {
      // Determine account type based on signup context
      // Check if user has pending staff invitation (staff signup)
      const email = email_addresses?.[0]?.email_address
      let accountType: 'provider' | 'staff' | 'customer' = 'customer'
      let signupFlow: 'provider-signup' | 'staff-signup' | 'customer-signup' | undefined = undefined

      if (email) {
        // Check for pending staff invitation
        const pendingInvitation = await prisma.staffInvitation.findFirst({
          where: {
            email,
            expiresAt: { gt: new Date() },
            acceptedAt: null,
          },
          select: { id: true, providerId: true },
        })

        if (pendingInvitation) {
          accountType = 'staff'
          signupFlow = 'staff-signup'
        } else {
          // Check if user signed up via provider path (check last signup attempt)
          // Since we can't reliably determine from webhook, default to customer
          // The redirect handler will update metadata if needed
          accountType = 'customer'
          signupFlow = 'customer-signup'
        }
      }

      // Set metadata on Clerk user
      const client = await clerkClient()
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          accountType,
          signupFlow,
          signupTimestamp: new Date().toISOString(),
        },
      })

      console.log(`Set Clerk metadata for user ${userId}:`, { accountType, signupFlow })
    } catch (error) {
      console.error('Error setting Clerk metadata:', error)
      // Don't fail the webhook - metadata can be set later
    }
  }

  // Handle user.updated event - sync metadata if needed
  if (eventType === 'user.updated') {
    // If metadata is missing, try to set it based on database state
    if (!public_metadata?.accountType) {
      try {
        const email = email_addresses?.[0]?.email_address
        if (email) {
          // Find user in database
          const dbUser = await prisma.user.findUnique({
            where: { clerkUserId: userId },
            include: {
              provider: { select: { id: true } },
              userProviders: { select: { id: true }, take: 1 },
            },
          })

          if (dbUser) {
            let accountType: 'provider' | 'staff' | 'customer' = 'customer'
            if (dbUser.provider) {
              accountType = 'provider'
            } else if (dbUser.userProviders.length > 0) {
              accountType = 'staff'
            }

            const client = await clerkClient()
            await client.users.updateUserMetadata(userId, {
              publicMetadata: {
                accountType,
                signupTimestamp: dbUser.createdAt.toISOString(),
              },
            })

            console.log(`Updated Clerk metadata for user ${userId}:`, { accountType })
          }
        }
      } catch (error) {
        console.error('Error updating Clerk metadata:', error)
      }
    }
  }

  return new Response('Webhook processed', { status: 200 })
}
