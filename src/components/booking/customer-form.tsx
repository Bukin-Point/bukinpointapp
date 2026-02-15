'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

// Serialized Service type with price as number instead of Decimal
type SerializedService = Omit<import('@prisma/client').Service, 'price'> & {
  price: number
}

interface CustomerFormProps {
  service: SerializedService
  date: Date
  time: string
  onSubmit: (data: {
    name: string
    phone: string
    email?: string
    notes?: string
    consentGiven: boolean
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
  userPhone?: string | null
  gatewayName?: string
}

export function CustomerForm({ service, date, time, onSubmit, onBack, loading, session, userPhone, gatewayName = 'OPAY' }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    phone: userPhone || '',
    email: session?.user?.email || '',
    notes: '',
  })
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [error, setError] = useState('')

  // Update phone when userPhone changes
  useEffect(() => {
    if (userPhone && !formData.phone) {
      setFormData(prev => ({ ...prev, phone: userPhone }))
    }
  }, [userPhone])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.phone) {
      setError('Name and phone number are required')
      return
    }

    if (!consentAccepted) {
      setError('Please accept the terms and conditions to continue')
      return
    }

    onSubmit({
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      notes: formData.notes || undefined,
      consentGiven: consentAccepted,
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
                <span className="font-medium">₦{service.price.toLocaleString()}</span>
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

          <div className="space-y-2 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                disabled={loading}
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="text-body-sm text-text-secondary group-hover:text-text">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-primary underline hover:no-underline">
                  Terms and Conditions
                </Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-primary underline hover:no-underline">
                  Privacy Policy
                </Link>
                {' '}*
              </span>
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button type="submit" disabled={loading || !consentAccepted} className="flex-1">
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              `Pay with ${gatewayName === 'PAYSTACK' ? 'Paystack' : 'OPay'}`
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
