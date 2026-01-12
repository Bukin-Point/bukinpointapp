import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Sign In | BukinPoint',
  description: 'Sign in to manage your business',
}

export default function AuthPage() {
  // Redirect to signin page
  redirect('/signin')
}
