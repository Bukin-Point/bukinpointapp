'use client'

import { useState, useEffect, useMemo } from 'react'
import { Provider, StaffMember } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { getAvailableSlots, getAvailableDays } from '@/app/book/[providerId]/actions'
import { useQuery } from '@tanstack/react-query'

// Serialized Service type with price as number instead of Decimal
type SerializedService = Omit<import('@prisma/client').Service, 'price'> & {
  price: number
}

type ProviderWithRelations = Provider & {
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

interface TimePickerProps {
  provider: ProviderWithRelations
  service: SerializedService
  selectedStaff: StaffMember | null
  onSelect: (date: Date, time: string, staff: StaffMember) => void
  onBack: () => void
}

export function TimePicker({ provider, service, selectedStaff, onSelect, onBack }: TimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; staff: StaffMember }>>([])
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set())
  const [allPossibleSlots, setAllPossibleSlots] = useState<Array<{ time: string; staff: StaffMember }>>([])
  const [loading, setLoading] = useState(false)
  const [loadingDays, setLoadingDays] = useState(false)

  // Get staff who can provide this service - memoize to prevent infinite loops
  const availableStaff = useMemo(() => 
    provider.staff.filter((staff) =>
      staff.services.some((ss) => ss.service.id === service.id)
    ),
    [provider.staff, service.id]
  )

  // Fetch available days on mount
  useEffect(() => {
    const fetchAvailableDays = async () => {
      setLoadingDays(true)
      try {
        const result = await getAvailableDays({
          providerId: provider.id,
          serviceId: service.id,
          daysAhead: 30,
        })
        setAvailableDays(new Set(result.availableDays || []))
      } catch (error) {
        console.error('Error fetching available days:', error)
      } finally {
        setLoadingDays(false)
      }
    }

    fetchAvailableDays()
  }, [provider.id, service.id])

  const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null
  const { data: slotsData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['availableSlots', provider.id, service.id, dateStr],
    queryFn: async () => {
      if (!selectedDate) return { slots: [] }
      return getAvailableSlots({
        providerId: provider.id,
        serviceId: service.id,
        date: selectedDate.toISOString(),
      })
    },
    enabled: !!selectedDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  useEffect(() => {
    if (slotsData?.slots) {
      setAvailableSlots(slotsData.slots)
    }
  }, [slotsData?.slots])

  // Generate all possible slots separately to avoid infinite loops
  useEffect(() => {
    const allSlots: Array<{ time: string; staff: StaffMember }> = []
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        availableStaff.forEach(staff => {
          allSlots.push({ time: timeString, staff })
        })
      }
    }
    setAllPossibleSlots(allSlots)
  }, [availableStaff])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime('')
  }

  // Generate next 30 days
  const today = new Date()
  const dates = Array.from({ length: 30 }, (_, i) => addDays(today, i))

  // Check if a date has available slots
  const isDateAvailable = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availableDays.has(dateStr)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Date & Time</CardTitle>
        <CardDescription>Choose when you'd like your appointment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-3 text-body-sm font-medium">Select Date</h3>
          {loadingDays ? (
            <p className="text-caption text-text-secondary">Loading available dates...</p>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {dates.map((date) => {
                const isAvailable = isDateAvailable(date)
                const isSelected = selectedDate && isSameDay(date, selectedDate)
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => isAvailable && handleDateSelect(date)}
                    disabled={!isAvailable}
                    className={`calendar-date rounded-md p-2 text-sm transition-colors ${
                      isSelected
                        ? 'calendar-date-selected bg-primary text-primary-foreground'
                        : isAvailable
                        ? 'hover:bg-gray-100 border border-input'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50 border border-gray-200'
                    }`}
                    title={!isAvailable ? 'No available slots for this date' : ''}
                  >
                    <div className="font-medium">{format(date, 'd')}</div>
                    <div className="text-xs">{format(date, 'EEE')}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selectedDate && (
          <div>
            <h3 className="mb-3 text-body-sm font-medium">
              Available Times for {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            {isLoadingSlots ? (
              <p className="text-caption">Loading available slots...</p>
            ) : availableSlots.length === 0 && allPossibleSlots.length === 0 ? (
              <p className="text-caption text-text-secondary">No available slots for this date</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {allPossibleSlots.map((slot, index) => {
                  const isAvailable = availableSlots.some(
                    s => s.time === slot.time && s.staff.id === slot.staff.id
                  )
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => isAvailable && onSelect(selectedDate, slot.time, slot.staff)}
                      disabled={!isAvailable}
                      className={`time-slot rounded-md border-2 p-2 text-sm font-medium transition-colors ${
                        isAvailable
                          ? 'border-gray-300 hover:border-primary hover:bg-primary-50 cursor-pointer'
                          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      }`}
                      title={!isAvailable ? 'This time slot is not available' : ''}
                    >
                      {slot.time}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => {
            setSelectedDate(new Date())
            setSelectedTime('')
            setAvailableSlots([])
            setAllPossibleSlots([])
            onBack()
          }}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
