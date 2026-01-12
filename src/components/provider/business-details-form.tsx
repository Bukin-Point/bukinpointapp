'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageUploader } from '@/components/ui/image-uploader'
import { updateProvider } from '@/actions/provider'
import { useToast } from '@/hooks/use-toast'
import { industries, timezones } from '@/lib/constants'
import { Provider } from '@prisma/client'

interface BusinessDetailsFormProps {
  provider: Provider
}

export function BusinessDetailsForm({ provider }: BusinessDetailsFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    businessName: provider.businessName,
    industry: provider.industry,
    address: provider.address || '',
    phone: provider.phone,
    email: provider.email,
    timezone: provider.timezone,
    businessImage: provider.businessImage || '',
  })
  const [loading, setLoading] = useState(false)

  // Update form data when provider prop changes (after refresh)
  useEffect(() => {
    setFormData({
      businessName: provider.businessName,
      industry: provider.industry,
      address: provider.address || '',
      phone: provider.phone,
      email: provider.email,
      timezone: provider.timezone,
      businessImage: provider.businessImage || '',
    })
  }, [provider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      const result = await updateProvider(provider.id, {
        ...formData,
        businessImage: formData.businessImage.trim() !== '' ? formData.businessImage : undefined,
      })

      if (result.error) {
        toast({
          title: 'Update Failed',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Profile Updated',
          description: 'Your business details have been updated successfully.',
        })
        router.refresh()
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
        <CardTitle>Business Details</CardTitle>
        <CardDescription>Update your business information</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-body-sm font-medium">
              Business Image (Optional)
            </label>
            <ImageUploader
              value={formData.businessImage || null}
              onChange={(url) => {
                setFormData((prev) => ({
                  ...prev,
                  businessImage: url || '',
                }))
              }}
              providerId={provider.id}
              maxSizeMB={2}
              disabled={loading}
            />
            <p className="text-caption text-text-secondary">
              Upload a business image. This will be displayed in place of your avatar when available.
            </p>
          </div>
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
            {loading ? 'Updating...' : 'Update Business Details'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
