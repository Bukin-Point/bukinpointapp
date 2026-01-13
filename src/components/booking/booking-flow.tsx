'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Provider, StaffMember } from '@prisma/client'
import { ServiceSelector } from './service-selector'
import { TimePicker } from './time-picker'
import { CustomerForm } from './customer-form'
import { createBooking } from '@/app/book/[providerId]/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Serialized Service type with price as number instead of Decimal
type SerializedService = Omit<import('@prisma/client').Service, 'price'> & {
  price: number
}

type ProviderWithRelations = Provider & {
  services: SerializedService[]
  staff: (StaffMember & {
    user: {
      name: string | null
      email: string
    }
    services: Array<{
      service: SerializedService
    }>
  })[]
}

interface BookingFlowProps {
  provider: ProviderWithRelations
  session?: {
    user: {
      id: string
      name: string | null
      email: string
    }
  } | null
  initialServiceId?: string
  userPhone?: string | null
}

type BookingStep = 'service' | 'time' | 'customer' | 'confirming'

export function BookingFlow({ provider, session, initialServiceId, userPhone }: BookingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<SerializedService | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-select service if initialServiceId is provided
  useEffect(() => {
    if (initialServiceId && !selectedService) {
      const service = provider.services.find(s => s.id === initialServiceId)
      if (service) {
        setSelectedService(service)
        // Find staff who can provide this service
        const availableStaff = provider.staff.filter((staff) =>
          staff.services.some((ss) => ss.service.id === service.id)
        )
        if (availableStaff.length > 0) {
          setSelectedStaff(availableStaff[0])
        }
        setStep('time')
      }
    }
  }, [initialServiceId, provider.services, provider.staff, selectedService])

  // Clear error when step changes
  useEffect(() => {
    setError('')
  }, [step])

  const handleServiceSelect = (service: SerializedService) => {
    setError('')
    setSelectedService(service)
    // Find staff members who can provide this service
    const availableStaff = provider.staff.filter((staff) =>
      staff.services.some((ss) => ss.service.id === service.id)
    )
    if (availableStaff.length > 0) {
      setSelectedStaff(availableStaff[0])
    }
    setStep('time')
  }

  const handleTimeSelect = (date: Date, time: string, staff: StaffMember) => {
    setError('')
    setSelectedDate(date)
    setSelectedTime(time)
    setSelectedStaff(staff)
    setStep('customer')
  }

  const handleCustomerSubmit = async (customerData: {
    name: string
    phone: string
    email?: string
    notes?: string
  }) => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) {
      setError('Please complete all steps')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Calculate end time based on service duration
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startDateTime = new Date(selectedDate)
      startDateTime.setHours(hours, minutes, 0, 0)
      const endDateTime = new Date(startDateTime)
      endDateTime.setMinutes(endDateTime.getMinutes() + selectedService.duration)

      const result = await createBooking({
        providerId: provider.id,
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        bookingDate: startDateTime,
        startTime: selectedTime,
        endTime: `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`,
        notes: customerData.notes,
      })

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else if (result.booking) {
        router.push(`/book/${provider.id}/confirm?ref=${result.booking.bookingRef}`)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-error">
          <CardContent className="pt-6">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {step === 'service' && (
        <ServiceSelector
          services={provider.services}
          onSelect={handleServiceSelect}
        />
      )}

      {step === 'time' && selectedService && (
        <TimePicker
          provider={provider}
          service={selectedService}
          selectedStaff={selectedStaff}
          onSelect={handleTimeSelect}
          onBack={() => {
            setError('')
            setStep('service')
          }}
        />
      )}

      {step === 'customer' && selectedService && selectedDate && selectedTime && (
        <CustomerForm
          service={selectedService}
          date={selectedDate}
          time={selectedTime}
          onSubmit={handleCustomerSubmit}
          onBack={() => {
            setError('')
            setStep('time')
          }}
          loading={loading}
          session={session}
          userPhone={userPhone}
        />
      )}
    </div>
  )
}
