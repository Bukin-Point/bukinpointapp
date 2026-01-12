'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp, useSession } from '@/lib/auth-client'
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
import { getRedirectContext, type AuthFlow } from '@/lib/auth-redirect'
import { getRedirectPath, getRedirectUrlWithSubdomain, validateRedirectUrl } from '@/lib/auth-utils'

export function SignUpForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [justSignedUp, setJustSignedUp] = useState(false)
  const sessionRef = useRef(session)

  // Keep session ref updated
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  // Redirect if already signed in (use useEffect to avoid render-time navigation)
  // BUT: Don't redirect if we just signed up (let onSuccess handle it)
  useEffect(() => {
    if (session?.user?.id && !justSignedUp) {
      // Check if we're coming from a successful provider signup
      const urlParams = new URLSearchParams(window.location.search)
      const signupFlow = urlParams.get('flow') as AuthFlow | null

      // If this is a provider signup flow, check for subdomain redirect
      if (signupFlow === 'provider-signup') {
        getRedirectContext(session.user.id, signupFlow).then(async context => {
          const redirectUrl = await getRedirectUrlWithSubdomain(context, session.user.id)

          // SECURITY: Validate URL before redirect
          if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
            if (validateRedirectUrl(redirectUrl)) {
              window.location.href = redirectUrl
            } else {
              // Security validation failed - fallback to path
              router.push('/onboarding?flow=provider-signup')
            }
          } else {
            // Path - use router
            router.push(redirectUrl)
          }
        })
        return
      }

      // Otherwise, determine user type and redirect accordingly
      getRedirectContext(session.user.id, signupFlow || null).then(async context => {
        const redirectUrl = await getRedirectUrlWithSubdomain(context, session.user.id)

        // SECURITY: Validate URL before redirect
        if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
          if (validateRedirectUrl(redirectUrl)) {
            window.location.href = redirectUrl
          } else {
            router.push(getRedirectPath(context))
          }
        } else {
          router.push(redirectUrl)
        }
      })
    }
  }, [session, router, justSignedUp])

  // Don't render form if already signed in
  if (session) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match. Please try again.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      await signUp.email(
        {
          email,
          password,
          name,
        },
        {
          onRequest: () => {
            setLoading(true)
          },
          onResponse: () => {
            setLoading(false)
          },
          onError: ctx => {
            // Check for duplicate email error
            const errorMessage = ctx.error.message || ''
            const errorStatus = ctx.error.status || 0
            const errorData = ctx.error.data || {}

            // Better Auth returns 422 for validation errors including duplicate emails
            // Check multiple indicators for duplicate email
            const isDuplicateEmail =
              errorStatus === 422 ||
              (errorMessage.toLowerCase().includes('email') &&
                (errorMessage.toLowerCase().includes('already') ||
                  errorMessage.toLowerCase().includes('exists') ||
                  errorMessage.toLowerCase().includes('unique') ||
                  errorMessage.toLowerCase().includes('taken') ||
                  errorData?.email?.includes('already') ||
                  errorData?.email?.includes('exists') ||
                  errorData?.email?.includes('unique')))

            if (isDuplicateEmail) {
              toast({
                title: 'Email Already Registered',
                description: `The email address "${email}" is already registered. Please sign in instead or use a different email address.`,
                variant: 'destructive',
              })
            } else {
              toast({
                title: 'Sign Up Failed',
                description: errorMessage || 'Failed to create account. Please try again.',
                variant: 'destructive',
              })
            }
            setLoading(false)
          },
          onSuccess: async () => {
            setJustSignedUp(true) // Prevent useEffect from redirecting
            toast({
              title: 'Account Created!',
              description: "Welcome to BukinPoint! Let's set up your business profile.",
            })

            // Immediately redirect to onboarding (no subdomain yet - will be created during onboarding)
            // After onboarding completes, user will be redirected to their subdomain
            router.push('/onboarding?flow=provider-signup')
            router.refresh()
          },
        }
      )
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your information to create an account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-body-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
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
                minLength={8}
                className="pr-10"
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
            <p className="text-caption">Must be at least 8 characters</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-body-sm font-medium">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                disabled={loading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
          <p className="text-center text-body-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/signin" className="text-link font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
