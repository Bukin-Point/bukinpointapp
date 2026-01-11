'use client'

import { useState, useMemo } from 'react'
import { Booking } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import {
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react'

type BookingWithRelations = Booking & {
  service: {
    id: string
    name: string
  }
  staff: {
    user: {
      name: string | null
      email: string
    }
  }
}

interface BookingTableProps {
  bookings: BookingWithRelations[]
  onViewDetails: (booking: BookingWithRelations) => void
  onStatusUpdate: (bookingId: string, newStatus: Booking['status']) => void
  loading?: string | null
}

const STATUS_COLORS = {
  PENDING: 'bg-warning-light text-warning',
  CONFIRMED: 'bg-success-light text-success',
  CANCELLED: 'bg-gray-200 text-gray-600',
  COMPLETED: 'bg-primary-50 text-primary',
  NO_SHOW: 'bg-error-light text-error',
}

type SortField = 'date' | 'customer' | 'status' | null
type SortDirection = 'asc' | 'desc'

export function BookingTable({
  bookings,
  onViewDetails,
  onStatusUpdate,
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
        case 'date':
          comparison =
            new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime()
          break
        case 'customer':
          comparison = a.customerName.localeCompare(b.customerName)
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
      setSortDirection('desc')
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
                <SortButton field="date">Date & Time</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="customer">Customer</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary hidden md:table-cell whitespace-nowrap">
                Service
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
              const formattedDate = format(new Date(booking.bookingDate), 'MMM dd, yyyy')
              const formattedTime = `${booking.startTime} - ${booking.endTime}`
              const isActionMenuOpen = openActionMenu === booking.id

              return (
                <tr
                  key={booking.id}
                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(booking)}
                >
                  <td className="p-3 text-body-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{formattedDate}</span>
                      <span className="text-text-secondary text-caption">{formattedTime}</span>
                    </div>
                  </td>
                  <td className="p-3 text-body-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{booking.customerName}</span>
                      <span className="text-text-secondary text-caption">{booking.customerPhone}</span>
                    </div>
                  </td>
                  <td className="p-3 text-body-sm hidden md:table-cell">
                    <span>{booking.service.name}</span>
                  </td>
                  <td className="p-3 text-body-sm hidden lg:table-cell">
                    <span className="text-text-secondary">
                      {booking.staff.user.name || booking.staff.user.email}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge className={STATUS_COLORS[booking.status]}>{booking.status}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <Popover
                        open={isActionMenuOpen}
                        onOpenChange={(open) => setOpenActionMenu(open ? booking.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-48 p-1"
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                onViewDetails(booking)
                                setOpenActionMenu(null)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                            {booking.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    onStatusUpdate(booking.id, 'CONFIRMED')
                                    setOpenActionMenu(null)
                                  }}
                                  disabled={loading === booking.id}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-destructive hover:text-destructive"
                                  onClick={() => {
                                    onStatusUpdate(booking.id, 'CANCELLED')
                                    setOpenActionMenu(null)
                                  }}
                                  disabled={loading === booking.id}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === 'CONFIRMED' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => {
                                    onStatusUpdate(booking.id, 'COMPLETED')
                                    setOpenActionMenu(null)
                                  }}
                                  disabled={loading === booking.id}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Completed
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-destructive hover:text-destructive"
                                  onClick={() => {
                                    onStatusUpdate(booking.id, 'NO_SHOW')
                                    setOpenActionMenu(null)
                                  }}
                                  disabled={loading === booking.id}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  No Show
                                </Button>
                              </>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
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
