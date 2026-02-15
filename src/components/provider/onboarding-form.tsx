'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createProvider } from '@/actions/provider'
import { useToast } from '@/hooks/use-toast'
import { industries, timezones } from '@/lib/constants'

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    address: '',
    phone: '',
    email: '',
    timezone: 'Africa/Lagos',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.businessName || !formData.industry || !formData.phone || !formData.email || !formData.timezone) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const result = await createProvider({
        ...formData,
        userId,
      })

      if (result.error) {
        toast({
          title: 'Setup Failed',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        const subdomain = (result as any).subdomain

        if (subdomain) {
          // Build subdomain URL for display
          const isLocal = process.env.NODE_ENV === 'development'
          const baseDomain = isLocal ? 'bukinpoint.test' : 'bukinpoint.com'
          const protocol = isLocal ? 'http' : 'https'
          const port = isLocal ? ':3000' : ''
          const subdomainUrl = `${protocol}://${subdomain}.${baseDomain}${port}`

          toast({
            title: 'Profile Created!',
            description: `Your business profile has been set up. Your booking URL: ${subdomainUrl}`,
          })

          // Redirect to subdomain dashboard after onboarding
          const subdomainDashboardUrl = `${subdomainUrl}/dashboard`

          // Use window.location for cross-domain redirect
          window.location.href = subdomainDashboardUrl
        } else {
          toast({
            title: 'Profile Created!',
            description: 'Your business profile has been set up successfully.',
          })
          // Fallback to main domain dashboard
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleIndustryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      industry: value,
    }))
  }

  const handleTimezoneChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      timezone: value,
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Please provide your business details</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="businessName" className="text-body-sm font-medium">
              Business Name *
            </label>
            <Input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="My Business"
              value={formData.businessName}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="industry" className="text-body-sm font-medium">
              Industry *
            </label>
            <Combobox
              options={industries}
              value={formData.industry}
              onValueChange={handleIndustryChange}
              placeholder="Select industry..."
              searchPlaceholder="Search industries..."
              emptyMessage="No industry found."
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
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-body-sm font-medium">
              Business Email *
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="business@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="address" className="text-body-sm font-medium">
              Address
            </label>
            <Input
              id="address"
              name="address"
              type="text"
              placeholder="123 Main Street, City"
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="timezone" className="text-body-sm font-medium">
              Timezone *
            </label>
            <Select
              value={formData.timezone}
              onValueChange={handleTimezoneChange}
              disabled={loading}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone..." />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Creating profile...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
