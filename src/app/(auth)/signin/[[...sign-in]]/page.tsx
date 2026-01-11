import { redirect } from 'next/navigation'

export default function SignInCatchAllPage() {
  // Redirect to unified auth page with customer tab (default)
  redirect('/auth')
}
