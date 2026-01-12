'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signUp, useSession } from '@/lib/auth-client'
import { acceptInvitationAfterSignup } from '@/actions/staff-invitations'
import { getRedirectContext } from '@/lib/auth-redirect'
import { getRedirectPath, getRedirectUrlWithSubdomain, validateRedirectUrl } from '@/lib/auth-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StaffSignUpFormProps {
  invitation: {
    id: string
    email: string
    role: 'OWNER' | 'STAFF'
    token: string
    provider: {
      id: string
      businessName: string
      industry: string
    }
  }
}

export function StaffSignUpForm({ invitation }: StaffSignUpFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const signUpClient = signUp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(invitation.email)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Handle invitation acceptance after signup
  useEffect(() => {
    if (session?.user?.id) {
      // Check if we're coming from a successful signup
      const urlParams = new URLSearchParams(window.location.search)
      const signupSuccess = urlParams.get('signup')
      const token = urlParams.get('token') || invitation.token
      
      if (signupSuccess === 'success' && token) {
        // Accept invitation and redirect
        acceptInvitationAfterSignup(token, session.user.id)
          .then((result) => {
            if (result.error) {
              toast({
                title: 'Error',
                description: result.error,
                className: 'destructive',
              })
            } else {
              toast({
                title: 'Welcome!',
                description: `You've joined ${invitation.provider.businessName}!`,
              })
              // Wait a bit for database to sync, then redirect
              setTimeout(async () => {
                const context = await getRedirectContext(session.user.id, 'staff-signup')
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
                router.refresh()
              }, 500)
            }
          })
          .catch((err) => {
            console.error('Error accepting invitation:', err)
            toast({
              title: 'Error',
              description: 'Failed to accept invitation. Please try again.',
              className: 'destructive',
            })
          })
      } else if (!signupSuccess) {
        // Already signed in and no signup success flag - check if staff and redirect accordingly
        getRedirectContext(session.user.id, 'staff-signup').then(async (context) => {
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
    }
  }, [session, router, invitation])

  // Don't render form if already signed in
  if (session) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (email !== invitation.email) {
      toast({
        title: 'Email Mismatch',
        description: 'The email must match the invitation email.',
        variant: 'destructive',
      })
      return
    }

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
      // First, create the user account
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
              // User already exists, try to accept invitation directly
              handleExistingUser()
            } else {
              toast({
                title: 'Sign Up Failed',
                description: ctx.error.message || 'Failed to create account. Please try again.',
                className: 'destructive',
              })
              setLoading(false)
            }
          },
          onSuccess: async () => {
            // After successful signup, Better Auth automatically signs the user in
            // Redirect to same page with token so useEffect can handle invitation acceptance
            toast({
              title: 'Account Created!',
              description: 'Completing your staff setup...',
            })
            
            // Redirect to same page with token parameter
            // The useEffect hook will detect the session and accept the invitation
            router.push(`/signup/staff?token=${invitation.token}&signup=success`)
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

  const handleExistingUser = async () => {
    // User already exists, redirect to signin with invitation token
    // The signin flow will handle accepting the invitation after successful authentication
    setLoading(false)
    toast({
      title: 'Account Exists',
      description: 'Please sign in with your existing account to accept the invitation.',
    })
    router.push(`/signin?email=${encodeURIComponent(invitation.email)}&invitationToken=${invitation.token}`)
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
        <CardDescription>
          Complete your account setup to join {invitation.provider.businessName}
        </CardDescription>
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
              disabled={loading || true} // Email is pre-filled and should match invitation
              className="bg-muted"
            />
            <p className="text-caption text-text-secondary">
              This email matches your invitation
            </p>
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
            {loading ? 'Creating account...' : 'Create Account & Join Team'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
