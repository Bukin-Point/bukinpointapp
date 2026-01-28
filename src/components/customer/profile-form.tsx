'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateCustomerProfile } from '@/actions/customer'
import { useToast } from '@/hooks/use-toast'

interface ProfileFormProps {
  userId: string
  initialName: string | null
  initialEmail: string
  initialPhone: string | null
}

export function ProfileForm({ userId, initialName, initialEmail, initialPhone }: ProfileFormProps) {
  const { toast } = useToast()
  const [name, setName] = useState(initialName || '')
  const [phone, setPhone] = useState(initialPhone || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await updateCustomerProfile({
        userId,
        name: name || undefined,
        phone: phone || undefined,
      })

      if (result.error) {
        setError(result.error)
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        })
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Update your profile details</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-body-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
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
              value={initialEmail}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-caption text-text-secondary">
              Email cannot be changed. It's managed by your authentication provider.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-body-sm font-medium">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 800 000 0000"
              disabled={loading}
            />
            <p className="text-caption text-text-secondary">
              Your phone number will be pre-filled when making bookings.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  )
}
