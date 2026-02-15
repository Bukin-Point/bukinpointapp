'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { rescheduleBooking } from '@/actions/bookings'
import { getAvailableSlots } from '@/app/book/[providerId]/actions'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, isSameDay } from 'date-fns'
import { Booking } from '@prisma/client'

type BookingWithRelations = Booking & {
  service: {
    id: string
    name: string
  }
  userProvider: {
    id: string
    user: {
      name: string | null
      email: string
    }
  }
}

interface RescheduleBookingModalProps {
  booking: BookingWithRelations
  providerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RescheduleBookingModal({
  booking,
  providerId,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleBookingModalProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; staff: any }>>([])
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(null)
      setSelectedTime('')
      setAvailableSlots([])
      setError('')
    } else {
      // Set initial date to current booking date
      setSelectedDate(new Date(booking.bookingDate))
    }
  }, [open, booking])

  // Fetch slots when date changes
  useEffect(() => {
    if (selectedDate && open) {
      fetchSlots()
    }
  }, [selectedDate, open])

  const fetchSlots = async () => {
    if (!selectedDate) return

    setLoadingSlots(true)
    try {
      const result = await getAvailableSlots({
        providerId,
        serviceId: booking.service.id,
        date: selectedDate.toISOString(),
      })

      // Filter slots by the booking's staff member
      const filteredSlots = (result.slots || []).filter(
        slot => slot.userProvider.id === booking.userProvider.id
      )

      setAvailableSlots(filteredSlots)
    } catch (error) {
      console.error('Error fetching slots:', error)
      toast({
        title: 'Error',
        description: 'Failed to load available time slots',
        variant: 'destructive',
      })
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime('')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time')
      return
    }

    // Calculate end time (use service duration from booking)
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const startDateTime = new Date(selectedDate)
    startDateTime.setHours(hours, minutes, 0, 0)
    
    // Get service duration - we'll need to fetch it or estimate
    // For now, calculate based on original booking duration
    const originalStart = new Date(booking.bookingDate)
    const [origHours, origMins] = booking.startTime.split(':').map(Number)
    originalStart.setHours(origHours, origMins, 0, 0)
    
    const originalEnd = new Date(booking.bookingDate)
    const [endHours, endMins] = booking.endTime.split(':').map(Number)
    originalEnd.setHours(endHours, endMins, 0, 0)
    
    const durationMinutes = (originalEnd.getTime() - originalStart.getTime()) / (1000 * 60)
    
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes)

    const endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`

    setLoading(true)
    try {
      const result = await rescheduleBooking({
        bookingId: booking.id,
        newDate: selectedDate,
        newStartTime: selectedTime,
        newEndTime: endTime,
        initiatedBy: 'provider',
      })

      if (result.error) {
        setError(result.error)
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Success',
          description: 'Booking rescheduled successfully',
        })
        onSuccess()
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate next 30 days for date picker
  const today = new Date()
  const dates = Array.from({ length: 30 }, (_, i) => addDays(today, i))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
          <DialogDescription>
            Select a new date and time for this booking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {error && (
              <div className="rounded-md bg-error-light p-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="rounded-md bg-gray-50 p-4">
              <h4 className="mb-2 font-medium text-sm">Current Booking</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Service:</span>
                  <span className="font-medium">{booking.service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Current Date:</span>
                  <span className="font-medium">
                    {format(new Date(booking.bookingDate), 'MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Current Time:</span>
                  <span className="font-medium">
                    {booking.startTime} - {booking.endTime}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Select New Date</Label>
              <div className="grid grid-cols-7 gap-2 max-h-64 overflow-y-auto">
                {dates.map((date) => (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    className={`rounded-md p-2 text-sm border transition-colors ${
                      selectedDate && isSameDay(date, selectedDate)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-input'
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
                <Label className="mb-2 block">
                  Available Times for {format(selectedDate, 'MMMM d, yyyy')}
                </Label>
                {loadingSlots ? (
                  <p className="text-caption text-text-secondary">Loading slots...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-caption text-text-secondary">
                    No available slots for this date
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleTimeSelect(slot.time)}
                        className={`rounded-md border-2 p-2 text-sm font-medium transition-colors ${
                          selectedTime === slot.time
                            ? 'border-primary bg-primary-50'
                            : 'border-gray-300 hover:border-primary hover:bg-primary-50'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedDate || !selectedTime}>
                {loading ? 'Rescheduling...' : 'Reschedule Booking'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
