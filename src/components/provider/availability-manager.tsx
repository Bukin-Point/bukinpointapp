'use client'

import { useState } from 'react'
import { StaffMember, Availability } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AvailabilityForm } from '@/components/provider/availability-form'
import { format } from 'date-fns'

type StaffWithAvailability = StaffMember & {
  user: {
    id: string
    name: string | null
    email: string
  }
  availability: Availability[]
}

interface AvailabilityManagerProps {
  staff: StaffWithAvailability[]
  providerId: string
  timezone: string
  canManage?: boolean
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

export function AvailabilityManager({ staff, providerId, timezone, canManage = true }: AvailabilityManagerProps) {
  const [selectedStaff, setSelectedStaff] = useState<StaffWithAvailability | null>(
    staff[0] || null
  )
  const [showForm, setShowForm] = useState(false)

  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-body-sm text-text-secondary">
            {canManage
              ? 'No staff members available. Add staff members first.'
              : 'No availability set yet.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const getAvailabilityForDay = (dayOfWeek: number) => {
    if (!selectedStaff) return []
    return selectedStaff.availability.filter((av) => av.dayOfWeek === dayOfWeek && !av.isBlocked)
  }

  return (
    <div className="space-y-4">
      {canManage && staff.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Staff Member</CardTitle>
            <CardDescription>Choose a staff member to manage their availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {staff.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelectedStaff(member)
                    setShowForm(false)
                  }}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    selectedStaff?.id === member.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {member.user.name || member.user.email}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedStaff && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-600"
            >
              Add Availability
            </button>
          </div>

          {showForm && (
            <AvailabilityForm
              staffId={selectedStaff.id}
              providerId={providerId}
              existingAvailability={selectedStaff.availability}
              onSuccess={() => {
                setShowForm(false)
                window.location.reload()
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>Current availability for {selectedStaff.user.name || selectedStaff.user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const dayAvailability = getAvailabilityForDay(day.value)
                  return (
                    <div key={day.value} className="flex items-start gap-4">
                      <div className="w-24 font-medium">{day.label}</div>
                      <div className="flex-1">
                        {dayAvailability.length === 0 ? (
                          <span className="text-caption text-text-secondary">Not available</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {dayAvailability.map((av) => (
                              <span
                                key={av.id}
                                className="rounded-md bg-primary-50 px-3 py-1 text-sm text-primary"
                              >
                                {av.startTime} - {av.endTime}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
