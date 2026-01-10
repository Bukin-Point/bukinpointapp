import { auth } from './auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    return session
  } catch (error) {
    return null
  }
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    redirect('/signin')
  }
  return session
}

export async function requireProvider() {
  const session = await requireAuth()
  // TODO: Check if user has a provider profile
  // For now, we'll check in the onboarding flow
  return session
}
