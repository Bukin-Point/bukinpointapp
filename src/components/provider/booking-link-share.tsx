'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
    
    // Get base URL from environment or current origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (typeof window !== 'undefined' ? window.location.origin : '')
    
    // Extract domain from base URL
    // Examples:
    // - "https://dev.bukinpoint.com" -> "bukinpoint.com"
    // - "https://bukinpoint.com" -> "bukinpoint.com"
    // - "http://localhost:3000" -> "bukinpoint.com" (fallback)
    let domain = baseUrl.replace(/^https?:\/\//, '')
    
    // Remove port if present
    domain = domain.split(':')[0]
    
    // Extract root domain (remove subdomain if present)
    const parts = domain.split('.')
    if (parts.length >= 2) {
      // Take last two parts (e.g., "bukinpoint.com")
      domain = parts.slice(-2).join('.')
    }
    
    // If baseUrl is localhost or doesn't have a proper domain, use fallback
    if (domain.includes('localhost') || domain.includes('127.0.0.1') || !domain.includes('.')) {
      domain = 'bukinpoint.com' // Fallback for development
    }
    
    const protocol = baseUrl.startsWith('https') ? 'https' : 'http'
    return `${protocol}://${subdomain}.${domain}`
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
