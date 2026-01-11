import { SettingsNav } from '@/components/provider/settings-nav'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
          <SettingsNav />
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  )
}
