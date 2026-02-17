import { SettingsNav } from '@/components/provider/settings-nav'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { redirect } from 'next/navigation'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/signin')

  const accessContext = await getProviderAccess(session.user.id)
  if (!accessContext) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 mb-2">Settings</h1>
        <p className="text-body-sm text-text-secondary">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <SettingsNav accessContext={accessContext} />
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  )
}
