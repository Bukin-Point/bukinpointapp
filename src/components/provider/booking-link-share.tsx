'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getSubdomainUrl } from '@/lib/url'

interface BookingLinkShareProps {
  subdomain: string | null
  businessName: string
}

export function BookingLinkShare({ subdomain, businessName }: BookingLinkShareProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Build the booking URL
  const getBookingUrl = () => {
    if (!subdomain) return null

    try {
      return getSubdomainUrl(subdomain)
    } catch {
      return `https://${subdomain}.bukinpoint.com`
    }
  }

  const bookingUrl = getBookingUrl()

  const handleCopy = async () => {
    if (!bookingUrl) return

    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      toast({
        title: 'Link Copied!',
        description: 'Your booking link has been copied to clipboard.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy link. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (!subdomain || !bookingUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Booking Link
          </CardTitle>
          <CardDescription>
            Your custom booking link will be available after completing onboarding.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Your Booking Link
        </CardTitle>
        <CardDescription>
          Share this link with your customers so they can book appointments with {businessName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="booking-url" className="text-body-sm font-medium">
            Booking URL
          </label>
          <div className="flex gap-2">
            <Input
              id="booking-url"
              value={bookingUrl || ''}
              readOnly
              className="font-mono text-body-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
              aria-label="Copy booking link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-caption text-text-secondary">
            Customers visiting this link will see only your services and can book appointments directly.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
