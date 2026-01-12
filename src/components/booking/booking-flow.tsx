'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Provider, Service, StaffMember } from '@prisma/client'
import { ServiceSelector } from './service-selector'
import { TimePicker } from './time-picker'
import { CustomerForm } from './customer-form'
import { createBooking } from '@/app/book/[providerId]/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ProviderWithRelations = Provider & {
  services: Service[]
  staff: (StaffMember & {
    user: {
      name: string | null
      email: string
    }
    services: Array<{
      service: Service
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
}

type BookingStep = 'service' | 'time' | 'customer' | 'confirming'

export function BookingFlow({ provider, session }: BookingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleServiceSelect = (service: Service) => {
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
          onBack={() => setStep('service')}
        />
      )}

      {step === 'customer' && selectedService && selectedDate && selectedTime && (
        <CustomerForm
          service={selectedService}
          date={selectedDate}
          time={selectedTime}
          onSubmit={handleCustomerSubmit}
          onBack={() => setStep('time')}
          loading={loading}
          session={session}
        />
      )}
    </div>
  )
}
