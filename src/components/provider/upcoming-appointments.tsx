'use client'

import { Booking } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { Clock, Calendar } from 'lucide-react'

type BookingWithRelations = Booking & {
  service: {
    id: string
    name: string
  }
  userProvider: {
    user: {
      name: string | null
      email: string
    }
  }
}

interface UpcomingAppointmentsProps {
  appointments: BookingWithRelations[]
}

const STATUS_COLORS = {
  PENDING: 'bg-warning-light text-warning',
  CONFIRMED: 'bg-success-light text-success',
  CANCELLED: 'bg-gray-200 text-gray-600',
  COMPLETED: 'bg-primary-50 text-primary',
  NO_SHOW: 'bg-error-light text-error',
}

function formatAppointmentDate(date: Date, time: string): string {
  if (isToday(date)) {
    return `Today at ${time}`
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${time}`
  }
  const daysDiff = differenceInDays(date, new Date())
  if (daysDiff <= 7) {
    return `${format(date, 'EEEE')} at ${time}`
  }
  return format(date, 'MMM dd, yyyy') + ` at ${time}`
}

export function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-text-secondary opacity-50" />
          <p className="mt-4 text-body-sm text-text-secondary">
            No upcoming appointments scheduled.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Appointments</CardTitle>
        <CardDescription>Your scheduled appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const appointmentDate = new Date(appointment.bookingDate)
            const isTodayAppointment = isToday(appointmentDate)

            return (
              <div
                key={appointment.id}
                className={`rounded-lg border p-4 ${
                  isTodayAppointment ? 'border-primary bg-primary-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{appointment.service.name}</p>
                      <Badge className={STATUS_COLORS[appointment.status]}>
                        {appointment.status}
                      </Badge>
                    </div>
                    <p className="text-body-sm text-text-secondary">
                      {appointment.customerName} • {appointment.customerPhone}
                    </p>
                    <div className="flex items-center gap-2 text-body-sm">
                      <Calendar className="h-4 w-4 text-text-secondary" />
                      <span className="text-text-secondary">
                        {formatAppointmentDate(appointmentDate, appointment.startTime)}
                      </span>
                    </div>
                    <p className="text-caption text-text-secondary">
                      userProvider: {appointment.userProvider.user.name || appointment.userProvider.user.email}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
