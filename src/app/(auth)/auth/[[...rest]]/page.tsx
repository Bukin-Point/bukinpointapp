import { UnifiedAuth } from '@/components/auth/unified-auth'

export const metadata = {
  title: 'Sign In or Sign Up | BukinPoint',
  description: 'Sign in or create an account to book services or manage your business',
}

export default function AuthPage() {
  return <UnifiedAuth />
}
