import { redirect } from 'next/navigation'

export default function SettingsPage() {
  // Redirect to business details by default
  redirect('/settings/business')
}
