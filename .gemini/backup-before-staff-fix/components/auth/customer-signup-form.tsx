'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession, signUp } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function CustomerSignUpForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const signUpClient = signUp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Redirect if already signed in
  useEffect(() => {
    if (session?.user?.id) {
      // Check if we're coming from a successful customer signup
      const urlParams = new URLSearchParams(window.location.search)
      const signupFlow = urlParams.get('flow')

      // If this is a customer signup flow, go to customer dashboard
      if (signupFlow === 'customer-signup') {
        router.push('/customer/dashboard')
        return
      }

      // Otherwise, use centralized redirect
      import('@/lib/auth-redirect').then(({ getRedirectContext }) => {
        import('@/lib/auth-utils').then(({ getRedirectPath }) => {
          getRedirectContext(session.user.id, 'customer-signup').then((context) => {
            const redirectPath = getRedirectPath(context)
            router.push(redirectPath)
          })
        })
      })
    }
  }, [session, router])

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
        className: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters long.',
        className: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      await signUpClient.email(
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
          onError: (ctx) => {
            const errorMessage = ctx.error.message || ''
            const isDuplicateEmail =
              errorMessage.toLowerCase().includes('email') &&
              (errorMessage.toLowerCase().includes('already') ||
               errorMessage.toLowerCase().includes('exists') ||
               errorMessage.toLowerCase().includes('unique') ||
               errorMessage.toLowerCase().includes('taken') ||
               ctx.error.status === 422)

            if (isDuplicateEmail) {
              toast({
                title: 'Email Already Registered',
                description: `The email address '${email}' is already registered. Please sign in instead or use a different email address.`,
                className: 'destructive',
              })
            } else {
              toast({
                title: 'Sign Up Failed',
                description: ctx.error.message || 'Failed to create account. Please try again.',
                className: 'destructive',
              })
            }
            setLoading(false)
          },
          onSuccess: () => {
            toast({
              title: 'Account Created!',
              description: 'Welcome to BukinPoint! You can now track your bookings.',
            })
            // Redirect with flow parameter to ensure correct routing
            router.push('/customer/dashboard?flow=customer-signup')
            router.refresh()
          },
        }
      )
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        className: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your information to create a customer account</CardDescription>
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
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
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
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
