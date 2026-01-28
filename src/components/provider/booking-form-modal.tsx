'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { createManualBooking } from '@/actions/bookings'
import { getAvailableSlots } from '@/app/book/[providerId]/actions'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, isSameDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

type Service = {
  id: string
  name: string
  duration: number
  price: number
}

type StaffMember = {
  id: string
  user: {
    name: string | null
    email: string
  }
}

interface BookingFormModalProps {
  providerId: string
  services: Service[]
  staff: StaffMember[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BookingFormModal({
  providerId,
  services,
  staff,
  open,
  onOpenChange,
  onSuccess,
}: BookingFormModalProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState<'service' | 'date' | 'customer'>('service')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [overrideAvailability, setOverrideAvailability] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; staff: StaffMember }>>([])
  const [allPossibleSlots, setAllPossibleSlots] = useState<Array<{ time: string; staff: StaffMember }>>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Customer details
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')

  // Get selected service
  const selectedService = services.find(s => s.id === selectedServiceId)
  
  // Get available staff for selected service
  // Note: We'll show all staff and let the server validate service assignment
  const availableStaffForService = selectedServiceId ? staff : []

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep('service')
      setSelectedServiceId('')
      setSelectedStaffId('')
      setSelectedDate(null)
      setSelectedTime('')
      setOverrideAvailability(false)
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
      setNotes('')
      setError('')
      setAvailableSlots([])
      setAllPossibleSlots([])
    }
  }, [open])

  // When service changes, reset staff selection
  useEffect(() => {
    if (selectedServiceId) {
      setSelectedStaffId('')
      setSelectedDate(null)
      setSelectedTime('')
      setAvailableSlots([])
      setAllPossibleSlots([])
    }
  }, [selectedServiceId])

  // When service or date changes, fetch slots (staff can be selected later)
  useEffect(() => {
    if (selectedServiceId && selectedDate) {
      fetchSlots()
    }
  }, [selectedServiceId, selectedDate, overrideAvailability])

  const fetchSlots = async () => {
    if (!selectedServiceId || !selectedDate) return

    setLoadingSlots(true)
    try {
      const result = await getAvailableSlots({
        providerId,
        serviceId: selectedServiceId,
        date: selectedDate.toISOString(),
      })

      // Filter slots by selected staff if staff is selected
      let filteredSlots = result.slots || []
      if (selectedStaffId) {
        filteredSlots = filteredSlots.filter(slot => slot.staff.id === selectedStaffId)
      }

      setAvailableSlots(filteredSlots)

      // If override mode, generate all possible slots for selected staff
      if (overrideAvailability && selectedService && selectedStaffId) {
        const allSlots: Array<{ time: string; staff: StaffMember }> = []
        const selectedStaffMember = availableStaffForService.find(s => s.id === selectedStaffId)
        
        if (selectedStaffMember) {
          // Generate slots from 8:00 to 20:00 in 15-minute intervals
          for (let hour = 8; hour < 20; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
              allSlots.push({
                time: timeString,
                staff: selectedStaffMember,
              })
            }
          }
        }
        setAllPossibleSlots(allSlots)
      } else {
        setAllPossibleSlots([])
      }
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

  const handleServiceSelect = () => {
    if (!selectedServiceId) {
      setError('Please select a service')
      return
    }
    setError('')
    // Auto-select first available staff if none selected
    if (!selectedStaffId && availableStaffForService.length > 0) {
      setSelectedStaffId(availableStaffForService[0].id)
    }
    setStep('date')
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedTime('')
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleDateTimeNext = () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time')
      return
    }
    setError('')
    setStep('customer')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!customerName || !customerPhone) {
      setError('Customer name and phone are required')
      return
    }

    if (!selectedServiceId || !selectedStaffId || !selectedDate || !selectedTime) {
      setError('Please complete all booking details')
      return
    }

    setLoading(true)
    try {
      // Calculate end time
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const startDateTime = new Date(selectedDate)
      startDateTime.setHours(hours, minutes, 0, 0)
      const endDateTime = new Date(startDateTime)
      endDateTime.setMinutes(endDateTime.getMinutes() + (selectedService?.duration || 60))

      const endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`

      const result = await createManualBooking({
        providerId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        bookingDate: startDateTime,
        startTime: selectedTime,
        endTime,
        notes: notes || undefined,
        overrideAvailability,
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
          description: 'Booking created successfully',
        })
        onSuccess()
        onOpenChange(false)
        router.refresh()
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

  // Get slots to display based on override mode
  const slotsToDisplay = overrideAvailability ? allPossibleSlots : availableSlots

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Booking</DialogTitle>
          <DialogDescription>
            Create a booking for a walk-in customer or schedule a future appointment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {error && (
              <div className="rounded-md bg-error-light p-3 text-sm text-error">
                {error}
              </div>
            )}

            {/* Step 1: Service Selection */}
            {step === 'service' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Service *</Label>
                  <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration} min - ₦{service.price.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedServiceId && (
                  <div className="space-y-2">
                    <Label htmlFor="staff">Staff Member *</Label>
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStaffForService.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.user.name || s.user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleServiceSelect} disabled={!selectedServiceId}>
                    Next
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 2: Date & Time Selection */}
            {step === 'date' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-body-sm font-medium">Select Date & Time</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="override"
                      checked={overrideAvailability}
                      onChange={(e) => setOverrideAvailability(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="override" className="text-body-sm cursor-pointer">
                      Override Availability
                    </Label>
                  </div>
                </div>

                {overrideAvailability && (
                  <div className="rounded-md bg-warning-light p-3 text-sm text-warning">
                    Override mode enabled: You can book any time slot, even if it conflicts with existing bookings.
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Select Date</Label>
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
                  ) : !selectedStaffId ? (
                    <p className="text-caption text-text-secondary">
                      Please select a staff member first
                    </p>
                  ) : slotsToDisplay.length === 0 ? (
                    <p className="text-caption text-text-secondary">
                      {overrideAvailability ? 'Select a time slot (override mode - any time allowed)' : 'No available slots for this date. Try selecting a different date or enable override mode.'}
                    </p>
                  ) : (
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                        {slotsToDisplay.map((slot, index) => {
                          const isAvailable = availableSlots.some(s => s.time === slot.time && s.staff.id === slot.staff.id)
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleTimeSelect(slot.time)}
                              disabled={!overrideAvailability && !isAvailable}
                              className={`rounded-md border-2 p-2 text-sm font-medium transition-colors ${
                                selectedTime === slot.time
                                  ? 'border-primary bg-primary-50'
                                  : !overrideAvailability && !isAvailable
                                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'border-gray-300 hover:border-primary hover:bg-primary-50'
                              }`}
                            >
                              {slot.time}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStep('service')}>
                    Back
                  </Button>
                  <Button type="button" onClick={handleDateTimeNext} disabled={!selectedDate || !selectedTime}>
                    Next
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Step 3: Customer Details */}
            {step === 'customer' && (
              <div className="space-y-4">
                <h3 className="text-body-sm font-medium">Customer Details</h3>

                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email (Optional)</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or notes..."
                    disabled={loading}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="rounded-md bg-gray-50 p-4">
                  <h4 className="mb-2 font-medium text-sm">Booking Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Service:</span>
                      <span className="font-medium">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Date:</span>
                      <span className="font-medium">
                        {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Time:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStep('date')} disabled={loading}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Booking'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
