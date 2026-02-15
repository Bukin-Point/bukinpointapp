'use client'

import { useState } from 'react'
import { Availability } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { createBulkAvailability } from '@/actions/availability'
import { useToast } from '@/hooks/use-toast'

interface BulkAvailabilityFormProps {
  staffId: string
  providerId: string
  existingAvailability: Availability[]
  onSuccess: () => void
  onCancel: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

export function BulkAvailabilityForm({
  staffId,
  providerId,
  existingAvailability,
  onSuccess,
  onCancel,
}: BulkAvailabilityFormProps) {
  const { toast } = useToast()
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    )
  }

  const selectAllWeekdays = () => {
    setSelectedDays([1, 2, 3, 4, 5]) // Monday to Friday
  }

  const selectAllDays = () => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]) // All days
  }

  const clearSelection = () => {
    setSelectedDays([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (selectedDays.length === 0) {
      setError('Please select at least one day')
      return
    }

    if (startTime >= endTime) {
      setError('End time must be after start time')
      return
    }

    setLoading(true)

    try {
      // Check for conflicts for each selected day
      const conflicts: Array<{ day: string; conflicts: Availability[] }> = []
      
      selectedDays.forEach((dayValue) => {
        const dayConflicts = existingAvailability.filter(
          (av) =>
            av.dayOfWeek === dayValue &&
            !av.isBlocked &&
            ((startTime >= av.startTime && startTime < av.endTime) ||
              (endTime > av.startTime && endTime <= av.endTime) ||
              (startTime <= av.startTime && endTime >= av.endTime))
        )
        
        if (dayConflicts.length > 0) {
          const dayLabel = DAYS_OF_WEEK.find((d) => d.value === dayValue)?.label || ''
          conflicts.push({ day: dayLabel, conflicts: dayConflicts })
        }
      })

      if (conflicts.length > 0) {
        const conflictMessages = conflicts.map(
          (c) => `${c.day}: ${c.conflicts.map((av) => `${av.startTime}-${av.endTime}`).join(', ')}`
        )
        setError(`Conflicts detected:\n${conflictMessages.join('\n')}\n\nPlease resolve conflicts or choose different times.`)
        setLoading(false)
        return
      }

      const result = await createBulkAvailability({
        providerId,
        staffId,
        days: selectedDays,
        startTime,
        endTime,
        isBlocked: false,
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
          description: `Availability added for ${selectedDays.length} day(s)`,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Bulk Availability</CardTitle>
        <CardDescription>Set the same working hours for multiple days at once</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error whitespace-pre-line">
              {error}
            </div>
          )}

          {/* Day Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-body-sm font-medium">Select Days *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllWeekdays}
                  disabled={loading}
                >
                  Weekdays
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllDays}
                  disabled={loading}
                >
                  All Days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center space-x-2 p-3 rounded-md border cursor-pointer hover:bg-muted transition-colors"
                >
                  <Checkbox
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                    disabled={loading}
                  />
                  <span className="text-body-sm font-medium">{day.label}</span>
                </label>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-caption text-text-secondary">
                Selected: {selectedDays.length} day(s)
              </p>
            )}
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-body-sm font-medium">
                Start Time *
              </Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-body-sm font-medium">
                End Time *
              </Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Preview */}
          {selectedDays.length > 0 && startTime && endTime && startTime < endTime && (
            <div className="rounded-md bg-muted p-4 space-y-2">
              <p className="text-body-sm font-medium">Preview:</p>
              <div className="space-y-1">
                {selectedDays.map((dayValue) => {
                  const day = DAYS_OF_WEEK.find((d) => d.value === dayValue)
                  const existing = existingAvailability.filter(
                    (av) => av.dayOfWeek === dayValue && !av.isBlocked
                  )
                  return (
                    <div key={dayValue} className="flex items-center justify-between text-body-sm">
                      <span className="font-medium">{day?.label}:</span>
                      <div className="flex gap-2">
                        {existing.length > 0 && (
                          <span className="text-text-secondary">
                            Existing: {existing.map((av) => `${av.startTime}-${av.endTime}`).join(', ')}
                          </span>
                        )}
                        <span className="text-primary font-medium">
                          + {startTime} - {endTime}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || selectedDays.length === 0}>
            {loading ? 'Adding...' : `Add to ${selectedDays.length} Day(s)`}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
