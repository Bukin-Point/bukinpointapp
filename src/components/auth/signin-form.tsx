'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { acceptInvitationAfterSignup } from '@/actions/staff-invitations'
import { getPostSigninRedirectUrl } from '@/actions/auth'
import { validateRedirectUrl } from '@/lib/auth-utils'

interface SignInFormProps {
  initialEmail?: string
  invitationToken?: string
}

export function SignInForm({ initialEmail, invitationToken }: SignInFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const signInClient = signIn()
  // Set default email and password in dev environment
  const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
  const [email, setEmail] = useState(isDev ? 'sholajapheth@gmail.com' : initialEmail || '')
  const [password, setPassword] = useState(isDev ? 'samplepassword' : '')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  // Removed handlePostSigninRedirect function and useEffect per user request
  // Redirects are now handled directly in onSuccess callback using server action getPostSigninRedirectUrl

  // Don't render form if already signed in
  if (session) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signInClient.email(
        {
          email,
          password,
        },
        {
          onRequest: () => {
            setLoading(true)
          },
          onResponse: () => {
            setLoading(false)
          },
          onError: ctx => {
            const errorMessage = ctx.error.message || 'Failed to sign in'
            const isInvalidCredentials =
              errorMessage.toLowerCase().includes('invalid') ||
              errorMessage.toLowerCase().includes('password') ||
              errorMessage.toLowerCase().includes('credentials') ||
              ctx.error.status === 401

            if (isInvalidCredentials) {
              toast({
                title: 'Invalid Credentials',
                description: 'The email or password you entered is incorrect. Please try again.',
                // variant: 'destructive', // Remove variant for lint
              })
            } else {
              toast({
                title: 'Sign In Failed',
                description: errorMessage,
                // variant: 'destructive',
              })
            }
            setLoading(false)
          },
          onSuccess: async () => {

            // If there's an invitation token, redirect to accept it
            if (invitationToken) {
              router.push(`/signin/accept-invitation?token=${invitationToken}`)
              return
            }

            toast({
              title: 'Welcome Back!',
              description: 'You have been successfully signed in.',
            })

            // Use server action to get redirect URL (no polling, no useEffect)
            // Server action reads session from cookies/headers
            try {
              const redirectUrl = await getPostSigninRedirectUrl()
              

              if (redirectUrl) {
                // SECURITY: Validate URL before redirect
                if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
                  if (validateRedirectUrl(redirectUrl)) {
                    // Double-check the URL doesn't end with /signin
                    const urlObj = new URL(redirectUrl)
                    if (urlObj.pathname === '/signin') {
                      urlObj.pathname = '/dashboard'
                      window.location.href = urlObj.toString()
                    } else {
                      window.location.href = redirectUrl
                    }
                  } else {
                    // Security validation failed - fallback
                    router.push('/dashboard')
                  }
                } else {
                  // Path - use router
                  router.push(redirectUrl)
                }
              } else {
                // Fallback if server action returns null
                router.push('/dashboard')
              }
            } catch (error) {
              console.error('Error getting redirect URL:', error)
              // Fallback on error
              router.push('/dashboard')
            }
          },
        }
      )
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        // variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-body-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete={isDev ? 'username' : undefined}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-body-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
                autoComplete={isDev ? 'current-password' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
          <p className="text-center text-body-sm text-text-secondary">
            Don't have an account?{' '}
            <Link href="/signup" className="text-link font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
