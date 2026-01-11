import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getInvitationByToken } from '@/actions/staff-invitations'
import { StaffSignUpFormClerk } from '@/components/auth/staff-signup-form-clerk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/db'

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

  // Check if user is already signed in
  const session = await getSession()
  if (session) {
    // User is already signed in - check if email matches invitation
    // If not, they need to sign out first or we'll handle it in the accept page
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

  // Check if user with invitation email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, email: true },
  })

  // If user exists but is not signed in, redirect to signin with invitation token
  if (existingUser && !session) {
    redirect(`/signin?invitationToken=${token}&email=${encodeURIComponent(invitation.email)}`)
  }

  // If user is already signed in, check if email matches
  if (session) {
    const userEmailLower = session.user.email.toLowerCase().trim()
    const invitationEmailLower = invitation.email.toLowerCase().trim()
    
    if (userEmailLower === invitationEmailLower) {
      // Email matches - redirect to accept page
      redirect(`/signup/staff/accept?token=${token}`)
    } else {
      // Email doesn't match - show warning
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Email Mismatch</CardTitle>
              <CardDescription>
                You're currently signed in as <strong>{session.user.email}</strong>, but this invitation was sent to <strong>{invitation.email}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-body-sm text-text-secondary">
                Please sign out and sign up using the email address that received the invitation ({invitation.email}), or contact the person who invited you to send a new invitation to your current email.
              </p>
              <div className="flex gap-2">
                <a
                  href="/signin"
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Go to Sign In
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-h1 mb-2">Join {invitation.provider.businessName}</h1>
          <p className="text-body-sm text-text-secondary">
            You've been invited to join as {invitation.role === 'OWNER' ? 'an Owner' : 'Staff'}
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
