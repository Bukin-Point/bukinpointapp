'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery } from '@tanstack/react-query'
import { acceptInvitationAfterSignup } from '@/actions/staff-invitations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

function StaffSignUpAcceptContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userId: clerkUserId, isLoaded } = useAuth()
  const { toast } = useToast()
  const token = searchParams.get('token')
  const [isProcessing, setIsProcessing] = useState(false)

  // Get database user ID from Clerk user ID
  const { data: session } = useQuery({
    queryKey: ['session', clerkUserId],
    queryFn: async () => {
      const response = await fetch('/api/auth/session')
      if (!response.ok) return null
      return response.json()
    },
    enabled: !!clerkUserId && isLoaded,
  })

  const acceptMutation = useMutation({
    mutationFn: async (data: { token: string; userId: string }) => {
      return await acceptInvitationAfterSignup(data.token, data.userId)
    },
    onSuccess: async (result) => {
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          className: 'destructive',
        })
        setIsProcessing(false)
        return
      }

      toast({
        title: 'Welcome!',
        description: "You've successfully joined the team!",
      })

      // Redirect to dashboard (staff work on root domain, not subdomains)
      if (session?.user?.id) {
        router.push('/dashboard')
      } else {
        router.push('/dashboard')
      }
    },
    onError: (error) => {
      console.error('Error accepting invitation:', error)
      toast({
        title: 'Error',
        description: 'Failed to accept invitation. Please try again.',
          className: 'destructive',
      })
      setIsProcessing(false)
    },
  })

  useEffect(() => {
    if (isLoaded && clerkUserId && session?.user?.id && token && !isProcessing) {
      setIsProcessing(true)
      acceptMutation.mutate({ token, userId: session.user.id })
    }
  }, [isLoaded, clerkUserId, session, token, isProcessing, acceptMutation])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Missing Invitation Token</CardTitle>
            <CardDescription>
              The invitation token is missing. Please use the invitation link provided.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isLoaded || !clerkUserId || !session?.user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing...</CardTitle>
            <CardDescription>Please wait while we set up your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accepting Invitation</CardTitle>
          <CardDescription>
            {isProcessing
              ? 'Setting up your staff account...'
              : 'Please wait while we process your invitation.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function StaffSignUpAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>Please wait...</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <StaffSignUpAcceptContent />
    </Suspense>
  )
}
