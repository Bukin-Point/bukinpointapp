'use client'

import { useState, useMemo } from 'react'
import { Booking } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Ban,
} from 'lucide-react'
import { format } from 'date-fns'

type BookingWithRelations = Booking & {
  service: {
    id: string
    name: string
  }
  staff: {
    id: string
    user: {
      name: string | null
      email: string
    }
  }
}

interface BookingTableProps {
  bookings: BookingWithRelations[]
  onStatusUpdate: (bookingId: string, newStatus: Booking['status']) => void
  onCancel?: (bookingId: string) => void
  onReschedule?: (booking: BookingWithRelations) => void
  loading?: string | null
}

type SortField = 'customerName' | 'service' | 'date' | 'status' | null
type SortDirection = 'asc' | 'desc'

const STATUS_COLORS = {
  PENDING: 'bg-warning-light text-warning',
  CONFIRMED: 'bg-success-light text-success',
  CANCELLED: 'bg-gray-200 text-gray-600',
  COMPLETED: 'bg-primary-50 text-primary',
  NO_SHOW: 'bg-error-light text-error',
}

export function BookingTable({
  bookings,
  onStatusUpdate,
  onCancel,
  onReschedule,
  loading,
}: BookingTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)

  const sortedBookings = useMemo(() => {
    if (!sortField) return bookings

    const sorted = [...bookings].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'customerName':
          comparison = a.customerName.localeCompare(b.customerName)
          break
        case 'service':
          comparison = a.service.name.localeCompare(b.service.name)
          break
        case 'date':
          comparison = new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [bookings, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </button>
    )
  }

  const getStatusActions = (booking: BookingWithRelations) => {
    const actions: Array<{ label: string; status: Booking['status']; icon: React.ReactNode; variant?: 'default' | 'destructive'; type: 'status' | 'cancel' | 'reschedule' }> = []
    
    // Add cancel and reschedule for pending/confirmed bookings
    if (booking.status === 'PENDING' || booking.status === 'CONFIRMED') {
      if (onReschedule) {
        actions.push({
          label: 'Reschedule',
          status: booking.status,
          icon: <Calendar className="mr-2 h-4 w-4" />,
          type: 'reschedule',
        })
      }
      if (onCancel) {
        actions.push({
          label: 'Cancel',
          status: 'CANCELLED',
          icon: <Ban className="mr-2 h-4 w-4" />,
          variant: 'destructive',
          type: 'cancel',
        })
      }
    }
    
    if (booking.status === 'PENDING') {
      actions.push(
        {
          label: 'Confirm',
          status: 'CONFIRMED',
          icon: <CheckCircle className="mr-2 h-4 w-4" />,
          type: 'status',
        }
      )
    } else if (booking.status === 'CONFIRMED') {
      actions.push(
        {
          label: 'Mark Completed',
          status: 'COMPLETED',
          icon: <CheckCircle className="mr-2 h-4 w-4" />,
          type: 'status',
        },
        {
          label: 'No Show',
          status: 'NO_SHOW',
          icon: <XCircle className="mr-2 h-4 w-4" />,
          variant: 'destructive',
          type: 'status',
        }
      )
    }

    return actions
  }

  if (bookings.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-body-sm text-text-secondary">No bookings found.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="date">Date</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                Time
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="service">Service</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="customerName">Customer</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary hidden md:table-cell whitespace-nowrap">
                Phone
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary hidden lg:table-cell whitespace-nowrap">
                Staff
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="status">Status</SortButton>
              </th>
              <th className="text-right p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map((booking) => {
              const isActionMenuOpen = openActionMenu === booking.id
              const statusActions = getStatusActions(booking)

              return (
                <tr
                  key={booking.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3 text-body-sm">
                    <span>{format(new Date(booking.bookingDate), 'MMM dd, yyyy')}</span>
                  </td>
                  <td className="p-3 text-body-sm">
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </td>
                  <td className="p-3 text-body-sm">
                    <span className="font-medium">{booking.service.name}</span>
                    <div className="text-caption text-text-secondary mt-0.5">
                      Ref: {booking.bookingRef}
                    </div>
                  </td>
                  <td className="p-3 text-body-sm">
                    <span className="font-medium">{booking.customerName}</span>
                    {booking.customerEmail && (
                      <div className="text-caption text-text-secondary mt-0.5">
                        {booking.customerEmail}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-body-sm hidden md:table-cell">
                    <span>{booking.customerPhone}</span>
                  </td>
                  <td className="p-3 text-body-sm hidden lg:table-cell">
                    <span>{booking.staff.user.name || booking.staff.user.email}</span>
                  </td>
                  <td className="p-3">
                    <Badge className={STATUS_COLORS[booking.status]}>
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      {statusActions.length > 0 ? (
                        <Popover
                          open={isActionMenuOpen}
                          onOpenChange={(open) => setOpenActionMenu(open ? booking.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-48 p-1"
                            align="end"
                          >
                            <div className="space-y-1">
                              {statusActions.map((action, index) => (
                                <Button
                                  key={`${action.type}-${action.status}-${index}`}
                                  variant="ghost"
                                  size="sm"
                                  className={`w-full justify-start ${
                                    action.variant === 'destructive'
                                      ? 'text-destructive hover:text-destructive'
                                      : ''
                                  }`}
                                  onClick={() => {
                                    if (action.type === 'status') {
                                      onStatusUpdate(booking.id, action.status)
                                    } else if (action.type === 'cancel' && onCancel) {
                                      onCancel(booking.id)
                                    } else if (action.type === 'reschedule' && onReschedule) {
                                      onReschedule(booking)
                                    }
                                    setOpenActionMenu(null)
                                  }}
                                  disabled={loading === booking.id}
                                >
                                  {action.icon}
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-caption text-text-secondary">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
