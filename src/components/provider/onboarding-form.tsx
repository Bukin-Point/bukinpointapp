'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createProvider } from '@/actions/provider'
import { useToast } from '@/hooks/use-toast'

// Industry options
const industries = [
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'fitness', label: 'Fitness & Wellness' },
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'salon', label: 'Hair Salon & Barber' },
  { value: 'spa', label: 'Spa & Massage' },
  { value: 'therapy', label: 'Therapy & Counseling' },
  { value: 'dental', label: 'Dental' },
  { value: 'veterinary', label: 'Veterinary' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'education', label: 'Education & Tutoring' },
  { value: 'photography', label: 'Photography' },
  { value: 'automotive', label: 'Automotive Services' },
  { value: 'home-services', label: 'Home Services' },
  { value: 'cleaning', label: 'Cleaning Services' },
  { value: 'pet-care', label: 'Pet Care' },
  { value: 'personal-training', label: 'Personal Training' },
  { value: 'yoga', label: 'Yoga & Meditation' },
  { value: 'nail-salon', label: 'Nail Salon' },
  { value: 'tattoo', label: 'Tattoo & Piercing' },
  { value: 'other', label: 'Other' },
]

// Timezone options with common timezones
const timezones = [
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT - UTC+1)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST - UTC+2)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EET - UTC+2)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT - UTC+3)' },
  { value: 'Africa/Casablanca', label: 'Africa/Casablanca (WEST - UTC+1)' },
  { value: 'Africa/Accra', label: 'Africa/Accra (GMT - UTC+0)' },
  { value: 'Africa/Addis_Ababa', label: 'Africa/Addis Ababa (EAT - UTC+3)' },
  { value: 'Africa/Algiers', label: 'Africa/Algiers (CET - UTC+1)' },
  { value: 'Africa/Dar_es_Salaam', label: 'Africa/Dar es Salaam (EAT - UTC+3)' },
  { value: 'Africa/Khartoum', label: 'Africa/Khartoum (CAT - UTC+2)' },
  { value: 'Africa/Tunis', label: 'Africa/Tunis (CET - UTC+1)' },
  { value: 'America/New_York', label: 'America/New York (EST - UTC-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST - UTC-6)' },
  { value: 'America/Denver', label: 'America/Denver (MST - UTC-7)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST - UTC-8)' },
  { value: 'America/Toronto', label: 'America/Toronto (EST - UTC-5)' },
  { value: 'America/Mexico_City', label: 'America/Mexico City (CST - UTC-6)' },
  { value: 'America/Sao_Paulo', label: 'America/São Paulo (BRT - UTC-3)' },
  { value: 'Europe/London', label: 'Europe/London (GMT - UTC+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET - UTC+1)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET - UTC+1)' },
  { value: 'Europe/Rome', label: 'Europe/Rome (CET - UTC+1)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (CET - UTC+1)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET - UTC+1)' },
  { value: 'Europe/Stockholm', label: 'Europe/Stockholm (CET - UTC+1)' },
  { value: 'Europe/Dublin', label: 'Europe/Dublin (GMT - UTC+0)' },
  { value: 'Europe/Athens', label: 'Europe/Athens (EET - UTC+2)' },
  { value: 'Europe/Moscow', label: 'Europe/Moscow (MSK - UTC+3)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - UTC+4)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+5:30)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST - UTC+8)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong Kong (HKT - UTC+8)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT - UTC+7)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (KST - UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT - UTC+11)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEDT - UTC+11)' },
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane (AEST - UTC+10)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZDT - UTC+13)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
]

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
        toast({
          title: 'Profile Created!',
          description: 'Your business profile has been set up successfully.',
        })
        router.push('/dashboard')
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
            {loading ? 'Creating profile...' : 'Complete Setup'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
