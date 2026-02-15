import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { prisma } from '@/lib/db'
import { ProfileForm } from '@/components/customer/profile-form'

export default async function CustomerProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  })
  
  // Phone field is not yet in database - will be null until migration runs
  const phone: string | null = null

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

      <ProfileForm
        userId={user.id}
        initialName={user.name}
        initialEmail={user.email}
        initialPhone={phone}
      />
    </div>
  )
}
