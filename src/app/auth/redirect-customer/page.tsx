import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { getUserType } from '@/lib/auth-redirect'
import { AuthRedirectClient } from '@/components/auth/auth-redirect-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CustomerRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; type?: string }>
}) {
  const params = await searchParams
  const flow = params?.flow
  const requestedType = params?.type

  const session = await getSession()

  if (!session) {
    console.log('[Redirect-Customer] No session on server, delegating to client-side AuthRedirectClient')
    return <AuthRedirectClient />
  }

  console.log(`[Redirect-Customer] Processing flow: ${flow || 'default'}, user: ${session.user.id}`)

  // Check Clerk metadata first for account type
  let accountTypeFromMetadata: 'provider' | 'staff' | 'customer' | null = null
  try {
    const clerkUser = await currentUser()
    if (clerkUser?.publicMetadata?.accountType) {
      accountTypeFromMetadata = clerkUser.publicMetadata.accountType as 'provider' | 'staff' | 'customer'
      console.log(`[Redirect-Customer] Account type from metadata: ${accountTypeFromMetadata}`)
    }
  } catch (error) {
    console.warn('[Redirect-Customer] Error reading Clerk metadata:', error)
  }

  // Handle customer signup flow
  if (flow === 'customer-signup') {
    console.log('[Redirect-Customer] Handling customer-signup flow')
    redirect('/customer/dashboard?flow=customer-signup')
  }

  // If metadata says provider or staff but we're in customer redirect, redirect to provider dashboard
  if (accountTypeFromMetadata === 'provider' || accountTypeFromMetadata === 'staff') {
    console.log('[Redirect-Customer] Overriding to provider dashboard based on metadata')
    redirect('/dashboard')
  }

  // Get user type from database (fallback if metadata not available)
  const userId = session.user.id
  let userType: 'provider' | 'staff' | 'customer' | null = null

  try {
    console.log(`[Redirect-Customer] Fetching user type for: ${userId}`)
    userType = await getUserType(userId)
  } catch (error) {
    console.error('[Redirect-Customer] Error getting user type:', error)
    // Default to customer if error
    userType = 'customer'
  }

  console.log(`[Redirect-Customer] User type determined: ${userType}`)

  // If database says provider or staff, redirect to provider dashboard
  if (userType === 'provider' || userType === 'staff') {
    console.log('[Redirect-Customer] Redirecting to provider dashboard')
    redirect('/dashboard')
  }

  // Update Clerk metadata if it's different from what we determined
  if (userType === 'customer' && accountTypeFromMetadata !== 'customer') {
    try {
      const clerkUser = await currentUser()
      if (clerkUser?.id) {
        console.log(`[Redirect-Customer] Updating Clerk metadata for ${clerkUser.id} to type: customer`)
        const client = await clerkClient()
        await client.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            accountType: 'customer',
            ...(flow && { signupFlow: flow }),
          },
        })
      }
    } catch (error) {
      console.warn('[Redirect-Customer] Error updating Clerk metadata:', error)
      // Don't fail redirect if metadata update fails
    }
  }

  // Customer confirmed - redirect to customer dashboard
  console.log('[Redirect-Customer] Success, redirecting to customer dashboard')
  redirect('/customer/dashboard')
}
