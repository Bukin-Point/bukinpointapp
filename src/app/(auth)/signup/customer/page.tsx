import { redirect } from 'next/navigation'

export default function CustomerSignUpPage() {
  // Redirect to unified auth page with customer tab
  redirect('/auth?tab=customer')
}
