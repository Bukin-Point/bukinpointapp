import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { acceptInvitationAfterSignup } from '@/actions/staff-invitations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const session = await getSession()
  const params = await searchParams
  const token = params.token

  if (!session) {
    redirect('/signin')
  }

  if (!token) {
    redirect('/dashboard?error=missing_token')
  }

  // Accept invitation
  const result = await acceptInvitationAfterSignup(token, session.user.id)

  if (result.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Accepting Invitation</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-text-secondary">
              Please contact support if this issue persists.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success - redirect to dashboard
  redirect('/dashboard?invitation_accepted=true')
}
