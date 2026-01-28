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
    // If no session on server, let client-side handle it (session might not be available yet)
    return <AuthRedirectClient />
  }

  // Check Clerk metadata first for account type
  let accountTypeFromMetadata: 'provider' | 'staff' | 'customer' | null = null
  try {
    const clerkUser = await currentUser()
    if (clerkUser?.publicMetadata?.accountType) {
      accountTypeFromMetadata = clerkUser.publicMetadata.accountType as 'provider' | 'staff' | 'customer'
    }
  } catch (error) {
    console.warn('Error reading Clerk metadata:', error)
  }

  // Handle customer signup flow
  if (flow === 'customer-signup') {
    redirect('/customer/dashboard?flow=customer-signup')
  }

  // If metadata says provider or staff but we're in customer redirect, redirect to provider dashboard
  if (accountTypeFromMetadata === 'provider' || accountTypeFromMetadata === 'staff') {
    redirect('/dashboard')
  }

  // Get user type from database (fallback if metadata not available)
  const userId = session.user.id
  let userType: 'provider' | 'staff' | 'customer' | null = null
  
  try {
    userType = await getUserType(userId)
  } catch (error) {
    console.error('Error getting user type:', error)
    // Default to customer if error
    userType = 'customer'
  }

  // If database says provider or staff, redirect to provider dashboard
  if (userType === 'provider' || userType === 'staff') {
    redirect('/dashboard')
  }

  // Update Clerk metadata if it's different from what we determined
  if (userType === 'customer' && accountTypeFromMetadata !== 'customer') {
    try {
      const clerkUser = await currentUser()
      if (clerkUser?.id) {
        const client = await clerkClient()
        await client.users.updateUserMetadata(clerkUser.id, {
          publicMetadata: {
            accountType: 'customer',
            ...(flow && { signupFlow: flow }),
          },
        })
      }
    } catch (error) {
      console.warn('Error updating Clerk metadata:', error)
      // Don't fail redirect if metadata update fails
    }
  }

  // Customer confirmed - redirect to customer dashboard
  redirect('/customer/dashboard')
}
