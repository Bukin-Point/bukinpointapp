'use client'

import { Booking } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CheckCircle, XCircle, User, Phone, Mail, Calendar, Clock, UserCircle, FileText } from 'lucide-react'

type BookingWithRelations = Booking & {
  service: {
    id: string
    name: string
    price?: number
  }
  staff: {
    user: {
      name: string | null
      email: string
    }
  }
}

interface BookingDetailsModalProps {
  booking: BookingWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate: (bookingId: string, newStatus: Booking['status']) => void
  loading?: boolean
}

const STATUS_COLORS = {
  PENDING: 'bg-warning-light text-warning',
  CONFIRMED: 'bg-success-light text-success',
  CANCELLED: 'bg-gray-200 text-gray-600',
  COMPLETED: 'bg-primary-50 text-primary',
  NO_SHOW: 'bg-error-light text-error',
}

export function BookingDetailsModal({
  booking,
  open,
  onOpenChange,
  onStatusUpdate,
  loading = false,
}: BookingDetailsModalProps) {
  if (!booking) return null

  const formattedDate = format(new Date(booking.bookingDate), 'EEEE, MMMM d, yyyy')
  const formattedTime = `${booking.startTime} - ${booking.endTime}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-h3">Booking Details</DialogTitle>
              <DialogDescription className="mt-1">
                Reference: <span className="font-mono">{booking.bookingRef}</span>
              </DialogDescription>
            </div>
            <Badge className={STATUS_COLORS[booking.status]}>{booking.status}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <UserCircle className="h-4 w-4" />
                  Name
                </span>
                <p className="font-medium">{booking.customerName}</p>
              </div>
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <Phone className="h-4 w-4" />
                  Phone
                </span>
                <p className="font-medium">{booking.customerPhone}</p>
              </div>
              {booking.customerEmail && (
                <div>
                  <span className="text-text-secondary flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <p className="font-medium">{booking.customerEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" />
                  Date
                </span>
                <p className="font-medium">{formattedDate}</p>
              </div>
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" />
                  Time
                </span>
                <p className="font-medium">{formattedTime}</p>
              </div>
              <div>
                <span className="text-text-secondary mb-1">Service</span>
                <p className="font-medium">{booking.service.name}</p>
              </div>
              <div>
                <span className="text-text-secondary mb-1">Price</span>
                <p className="font-medium">₦{Number(booking.service?.price ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-text-secondary mb-1">Staff</span>
                <p className="font-medium">
                  {booking.staff.user.name || booking.staff.user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-3">
              <h3 className="text-h4 font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </h3>
              <div className="bg-muted rounded-md p-4">
                <p className="text-body-sm whitespace-pre-wrap">{booking.notes}</p>
              </div>
            </div>
          )}

          {/* Payment Status */}
          {booking.paymentStatus && (
            <div className="space-y-3">
              <h3 className="text-h4 font-semibold">Payment Status</h3>
              <div>
                <Badge
                  variant={booking.paymentStatus === 'PAID' ? 'default' : 'secondary'}
                  className="text-body-sm"
                >
                  {booking.paymentStatus}
                </Badge>
                {booking.paymentRef && (
                  <p className="text-body-sm text-text-secondary mt-2">
                    Reference: <span className="font-mono">{booking.paymentRef}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1 sm:flex-initial">
            {booking.status === 'PENDING' && (
              <>
                <Button
                  onClick={() => {
                    onStatusUpdate(booking.id, 'CONFIRMED')
                    onOpenChange(false)
                  }}
                  disabled={loading}
                  className="flex-1 sm:flex-initial"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onStatusUpdate(booking.id, 'CANCELLED')
                    onOpenChange(false)
                  }}
                  disabled={loading}
                  className="flex-1 sm:flex-initial"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
            {booking.status === 'CONFIRMED' && (
              <>
                <Button
                  onClick={() => {
                    onStatusUpdate(booking.id, 'COMPLETED')
                    onOpenChange(false)
                  }}
                  disabled={loading}
                  className="flex-1 sm:flex-initial"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Completed
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onStatusUpdate(booking.id, 'NO_SHOW')
                    onOpenChange(false)
                  }}
                  disabled={loading}
                  className="flex-1 sm:flex-initial"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  No Show
                </Button>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
