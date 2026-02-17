import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess } from '@/lib/staff-helpers'
import { isUserSuperAdmin } from '@/lib/auth-helpers-clerk'

export default function SettingsPage() {
  // Redirect to business details by default
  redirect('/settings/business')
}
