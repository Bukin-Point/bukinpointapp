'use client'

import { useState } from 'react'
import { Availability } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createAvailability, deleteAvailability } from '@/actions/availability'

interface AvailabilityFormProps {
  staffId: string
  providerId: string
  existingAvailability: Availability[]
  onSuccess: () => void
  onCancel: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export function AvailabilityForm({
  staffId,
  providerId,
  existingAvailability,
  onSuccess,
  onCancel,
}: AvailabilityFormProps) {
  const [formData, setFormData] = useState({
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '17:00',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check for conflicts
      const conflicts = existingAvailability.filter(
        (av) =>
          av.dayOfWeek === parseInt(formData.dayOfWeek) &&
          !av.isBlocked &&
          ((formData.startTime >= av.startTime && formData.startTime < av.endTime) ||
            (formData.endTime > av.startTime && formData.endTime <= av.endTime) ||
            (formData.startTime <= av.startTime && formData.endTime >= av.endTime))
      )

      if (conflicts.length > 0) {
        setError('This time slot conflicts with existing availability')
        setLoading(false)
        return
      }

      const result = await createAvailability({
        providerId,
        userProviderId: staffId,
        dayOfWeek: parseInt(formData.dayOfWeek),
        startTime: formData.startTime,
        endTime: formData.endTime,
        isBlocked: false,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (availabilityId: string) => {
    if (!confirm('Are you sure you want to delete this availability?')) {
      return
    }

    try {
      const result = await deleteAvailability(availabilityId)
      if (result.success) {
        onSuccess()
      } else {
        alert(result.error || 'Failed to delete availability')
      }
    } catch (error) {
      alert('An error occurred')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Availability</CardTitle>
        <CardDescription>Set working hours for a specific day</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="dayOfWeek" className="text-body-sm font-medium">
              Day of Week *
            </label>
            <select
              id="dayOfWeek"
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={(e) => setFormData((prev) => ({ ...prev, dayOfWeek: e.target.value }))}
              required
              disabled={loading}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startTime" className="text-body-sm font-medium">
                Start Time *
              </label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endTime" className="text-body-sm font-medium">
                End Time *
              </label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                required
                disabled={loading}
              />
            </div>
          </div>
          {existingAvailability.filter((av) => av.dayOfWeek === parseInt(formData.dayOfWeek) && !av.isBlocked).length > 0 && (
            <div className="space-y-2">
              <p className="text-body-sm font-medium">Existing Availability:</p>
              <div className="space-y-1">
                {existingAvailability
                  .filter((av) => av.dayOfWeek === parseInt(formData.dayOfWeek) && !av.isBlocked)
                  .map((av) => (
                    <div key={av.id} className="flex items-center justify-between rounded-md bg-gray-50 p-2">
                      <span className="text-body-sm">
                        {av.startTime} - {av.endTime}
                      </span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(av.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Availability'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
