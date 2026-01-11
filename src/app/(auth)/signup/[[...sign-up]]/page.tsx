import { redirect } from 'next/navigation'

export default function SignUpCatchAllPage() {
  // Redirect to unified auth page with provider tab (since this is the provider signup route)
  redirect('/auth?tab=provider')
}
