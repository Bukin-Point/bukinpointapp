'use client'

import { useState } from 'react'
import { Service } from '@prisma/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

interface CustomerFormProps {
  service: Service
  date: Date
  time: string
  onSubmit: (data: {
    name: string
    phone: string
    email?: string
    notes?: string
  }) => void
  onBack: () => void
  loading: boolean
  session?: {
    user: {
      id: string
      name: string | null
      email: string
    }
  } | null
}

export function CustomerForm({ service, date, time, onSubmit, onBack, loading, session }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    phone: '',
    email: session?.user?.email || '',
    notes: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.phone) {
      setError('Name and phone number are required')
      return
    }

    onSubmit({
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      notes: formData.notes || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Information</CardTitle>
        <CardDescription>Please provide your contact details</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-gray-50 p-4">
            <h3 className="mb-2 font-medium">Booking Summary</h3>
            <div className="space-y-1 text-body-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Service:</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Date:</span>
                <span className="font-medium">{format(date, 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Time:</span>
                <span className="font-medium">{time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Price:</span>
                <span className="font-medium">₦{Number(service.price).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {!session && (
            <div className="rounded-md bg-muted p-3 text-body-sm">
              <p className="text-text-secondary">
                Already have an account?{' '}
                <Link href="/signin" className="text-link font-medium">
                  Sign in
                </Link>
                {' '}for faster checkout and booking history.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-body-sm font-medium">
              Full Name *
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-body-sm font-medium">
              Phone Number *
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+234 800 000 0000"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-body-sm font-medium">
              Email (Optional)
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-body-sm font-medium">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Any special requests or notes..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              disabled={loading}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Processing...' : 'Complete Booking'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
