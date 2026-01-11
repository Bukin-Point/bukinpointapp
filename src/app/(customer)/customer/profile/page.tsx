import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CustomerProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    redirect('/signin')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">Profile</h1>
        <p className="text-body-sm text-text-secondary">
          Manage your account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-body-sm font-medium text-text-secondary">Name</label>
              <p className="text-body-sm mt-1">{user.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-body-sm font-medium text-text-secondary">Email</label>
              <p className="text-body-sm mt-1">{user.email}</p>
            </div>
            <div>
              <label className="text-body-sm font-medium text-text-secondary">Member Since</label>
              <p className="text-body-sm mt-1">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
