import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { getSession } from '@/lib/auth-helpers-clerk'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { prisma } from '@/lib/db'

export default async function ProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // Get Clerk user data for avatar and additional info
  const clerkUser = await currentUser()

  if (!clerkUser) {
    redirect('/signin')
  }

  // Get provider data to check for business image
  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
    select: { businessImage: true, businessName: true },
  })

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (clerkUser.firstName && clerkUser.lastName) {
      return `${clerkUser.firstName[0]}${clerkUser.lastName[0]}`.toUpperCase()
    }
    if (clerkUser.firstName) {
      return clerkUser.firstName[0].toUpperCase()
    }
    if (clerkUser.emailAddresses[0]?.emailAddress) {
      return clerkUser.emailAddresses[0].emailAddress[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">Profile</h1>
        <p className="text-body-sm text-text-secondary">Manage your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              {provider?.businessImage ? (
                <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-border">
                  <img
                    src={provider.businessImage}
                    alt={provider.businessName || 'Business'}
                    className="h-full w-full object-cover"
                    loading="eager"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <Avatar
                  src={clerkUser.imageUrl}
                  alt={clerkUser.firstName || 'User'}
                  fallback={getUserInitials()}
                  className="h-20 w-20"
                >
                  <AvatarImage src={clerkUser.imageUrl} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <h3 className="text-body-lg font-semibold">
                  {provider?.businessName || clerkUser.fullName || clerkUser.firstName || 'User'}
                </h3>
                <p className="text-body-sm text-text-secondary">
                  {clerkUser.emailAddresses[0]?.emailAddress || session.user.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-body-sm font-medium text-text-secondary">Full Name</label>
                <p className="text-body-sm mt-1">
                  {clerkUser.fullName || clerkUser.firstName || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-body-sm font-medium text-text-secondary">Email</label>
                <p className="text-body-sm mt-1">
                  {clerkUser.emailAddresses[0]?.emailAddress || session.user.email}
                </p>
              </div>
              {clerkUser.phoneNumbers && clerkUser.phoneNumbers.length > 0 && (
                <div>
                  <label className="text-body-sm font-medium text-text-secondary">Phone</label>
                  <p className="text-body-sm mt-1">
                    {clerkUser.phoneNumbers[0]?.phoneNumber || 'Not set'}
                  </p>
                </div>
              )}
              <div>
                <label className="text-body-sm font-medium text-text-secondary">Member Since</label>
                <p className="text-body-sm mt-1">
                  {new Date(clerkUser.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
