'use client'

import { useState } from 'react'
import { Provider, Service, StaffMember } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { getAvailableSlots } from '@/app/book/[providerId]/actions'

type ProviderWithRelations = Provider & {
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

interface TimePickerProps {
  provider: ProviderWithRelations
  service: Service
  selectedStaff: StaffMember | null
  onSelect: (date: Date, time: string, staff: StaffMember) => void
  onBack: () => void
}

export function TimePicker({ provider, service, selectedStaff, onSelect, onBack }: TimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; staff: StaffMember }>>([])
  const [loading, setLoading] = useState(false)

  // Get staff who can provide this service
  const availableStaff = provider.staff.filter((staff) =>
    staff.services.some((ss) => ss.service.id === service.id)
  )

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date)
    setLoading(true)

    try {
      const slots = await getAvailableSlots({
        providerId: provider.id,
        serviceId: service.id,
        date: date.toISOString(),
      })

      setAvailableSlots(slots.slots || [])
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate next 14 days
  const today = new Date()
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Date & Time</CardTitle>
        <CardDescription>Choose when you'd like your appointment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-3 text-body-sm font-medium">Select Date</h3>
          <div className="grid grid-cols-7 gap-2">
            {dates.map((date) => (
              <button
                key={date.toISOString()}
                onClick={() => handleDateSelect(date)}
                className={`calendar-date rounded-md p-2 text-sm ${
                  isSameDay(date, selectedDate)
                    ? 'calendar-date-selected'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">{format(date, 'd')}</div>
                <div className="text-xs">{format(date, 'EEE')}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedDate && (
          <div>
            <h3 className="mb-3 text-body-sm font-medium">
              Available Times for {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            {loading ? (
              <p className="text-caption">Loading available slots...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-caption text-text-secondary">No available slots for this date</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => onSelect(selectedDate, slot.time, slot.staff)}
                    className="time-slot rounded-md border-2 border-gray-300 p-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-50"
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
