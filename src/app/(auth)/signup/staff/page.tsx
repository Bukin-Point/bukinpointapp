import { redirect } from 'next/navigation'
import { getInvitationByToken } from '@/actions/staff-invitations'
import { StaffSignUpFormClerk } from '@/components/auth/staff-signup-form-clerk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function StaffSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    redirect('/signin?error=missing_token')
  }

  // Validate invitation token
  const invitationResult = await getInvitationByToken(token)

  if (invitationResult.error || !invitationResult.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{invitationResult.error || 'This invitation link is invalid or has expired.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm text-text-secondary">
              Please contact the person who invited you for a new invitation link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invitation = invitationResult.invitation!

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-h1 mb-2">Join {invitation.provider.businessName}</h1>
          <p className="text-body-sm text-text-secondary">
            You've been invited to join as {invitationResult.roleName === 'OWNER' ? 'an Owner' : 'Staff'}
          </p>
        </div>
        <StaffSignUpFormClerk
          invitationToken={token}
          invitationEmail={invitation.email}
        />
      </div>
    </div>
  )
}
