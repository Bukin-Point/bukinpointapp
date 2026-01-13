'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Booking } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { BookingTable } from './booking-table'
import { BookingFormModal } from './booking-form-modal'
import { RescheduleBookingModal } from './reschedule-booking-modal'
import { updateBookingStatus, cancelBooking } from '@/actions/bookings'
import { useToast } from '@/hooks/use-toast'
import { X, Plus, RefreshCw } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Combobox } from '@/components/ui/combobox'

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

type StaffWithUser = {
  id: string
  user: {
    name: string | null
    email: string
  }
}

interface BookingListProps {
  bookings: BookingWithRelations[]
  providerId: string
  staff: StaffWithUser[]
  services: Array<{ id: string; name: string; duration: number; price: number }>
  initialFilters?: {
    dateFilter?: string
    dateFrom?: string
    dateTo?: string
    staffId?: string
    serviceId?: string
  }
}

export function BookingList({ 
  bookings: initialBookings, 
  providerId,
  staff,
  services,
  initialFilters,
}: BookingListProps) {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<BookingWithRelations | null>(null)

  // Filter state from URL params
  const [dateFilter, setDateFilter] = useState(initialFilters?.dateFilter || 'all')
  const [dateFrom, setDateFrom] = useState(initialFilters?.dateFrom || '')
  const [dateTo, setDateTo] = useState(initialFilters?.dateTo || '')
  const [staffFilter, setStaffFilter] = useState(initialFilters?.staffId || 'all')
  const [serviceFilter, setServiceFilter] = useState(initialFilters?.serviceId || 'all')

  const bookingsQueryKey = [
    'bookings',
    providerId,
    dateFilter,
    dateFrom,
    dateTo,
    staffFilter,
    serviceFilter,
    statusFilter,
  ]

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: bookingsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('providerId', providerId)
      if (dateFilter && dateFilter !== 'all') params.set('dateFilter', dateFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (staffFilter !== 'all') params.set('staffId', staffFilter)
      if (serviceFilter !== 'all') params.set('serviceId', serviceFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/provider/bookings?${params.toString()}`, {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Failed to fetch bookings')
      }
      const json = await res.json()
      return json.bookings as BookingWithRelations[]
    },
    initialData: initialBookings,
    staleTime: 30000, // 30 seconds
  })

  const bookings = data || initialBookings

  const updateFilters = (newFilters: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.replace(`/bookings?${params.toString()}`)
  }

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value)
    setDateFrom('')
    setDateTo('')
    updateFilters({ dateFilter: value, dateFrom: undefined, dateTo: undefined })
  }

  const handleDateRangeChange = () => {
    updateFilters({ 
      dateFilter: dateFrom || dateTo ? 'custom' : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
  }

  const handleStaffFilterChange = (value: string) => {
    setStaffFilter(value)
    updateFilters({ staffId: value !== 'all' ? value : undefined })
  }

  const handleServiceFilterChange = (value: string) => {
    setServiceFilter(value)
    updateFilters({ serviceId: value !== 'all' ? value : undefined })
  }

  const clearFilters = () => {
    setDateFilter('all')
    setDateFrom('')
    setDateTo('')
    setStaffFilter('all')
    setServiceFilter('all')
    router.push('/bookings')
  }

  const statusMutation = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: Booking['status'] }) =>
      updateBookingStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsQueryKey })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsQueryKey })
    },
  })

  const handleStatusUpdate = async (bookingId: string, newStatus: Booking['status']) => {
    setLoading(bookingId)
    try {
      const result = await statusMutation.mutateAsync({ bookingId, status: newStatus })
      if (result.success) {
        toast({
          title: 'Success',
          description: `Booking status updated to ${newStatus}`,
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update booking status',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while updating the booking',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const handleBookingCreated = () => {
    queryClient.invalidateQueries({ queryKey: bookingsQueryKey })
  }

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    setLoading(bookingId)
    try {
      const result = await cancelMutation.mutateAsync(bookingId)
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Booking cancelled successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel booking',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while cancelling the booking',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const handleReschedule = (booking: BookingWithRelations) => {
    setSelectedBookingForReschedule(booking)
    setIsRescheduleModalOpen(true)
  }

  const handleRescheduleSuccess = () => {
    setIsRescheduleModalOpen(false)
    setSelectedBookingForReschedule(null)
    queryClient.invalidateQueries({ queryKey: bookingsQueryKey })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: bookingsQueryKey })
    refetch()
  }

  const staffOptions = useMemo(
    () => [
      { value: 'all', label: 'All Staff' },
      ...staff.map((s) => ({
        value: s.id,
        label: s.user.name || s.user.email,
      })),
    ],
    [staff]
  )

  const serviceOptions = useMemo(
    () => [
      { value: 'all', label: 'All Services' },
      ...services.map((service) => ({
        value: service.id,
        label: service.name,
      })),
    ],
    [services]
  )

  const hasActiveFilters = dateFilter !== 'all' || dateFrom || dateTo || staffFilter !== 'all' || serviceFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Header with Create & Refresh Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <Button onClick={() => setIsBookingModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Booking
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === 'CONFIRMED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('CONFIRMED')}
        >
          Confirmed
        </Button>
        <Button
          variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('COMPLETED')}
        >
          Completed
        </Button>
        <Button
          variant={statusFilter === 'CANCELLED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('CANCELLED')}
        >
          Cancelled
        </Button>
        <Button
          variant={statusFilter === 'NO_SHOW' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('NO_SHOW')}
        >
          No Show
        </Button>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-4 items-end p-4 border rounded-lg bg-muted/30">
        <div className="space-y-2">
          <label className="text-body-sm font-medium">Date Filter</label>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter === 'custom' && (
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    handleDateRangeChange()
                  }}
                  placeholder="From"
                  className="w-[140px]"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    handleDateRangeChange()
                  }}
                  placeholder="To"
                  className="w-[140px]"
                />
              </div>
            )}
          </div>
        </div>

        {staff.length > 0 && (
          <div className="space-y-2 min-w-[200px]">
            <label className="text-body-sm font-medium">Staff</label>
            <Combobox
              options={staffOptions}
              value={staffFilter}
              onValueChange={(value) => handleStaffFilterChange(value || 'all')}
              placeholder="All Staff"
              searchPlaceholder="Search staff..."
            />
          </div>
        )}

        {services.length > 0 && (
          <div className="space-y-2 min-w-[200px]">
            <label className="text-body-sm font-medium">Service</label>
            <Combobox
              options={serviceOptions}
              value={serviceFilter}
              onValueChange={(value) => handleServiceFilterChange(value || 'all')}
              placeholder="All Services"
              searchPlaceholder="Search services..."
            />
          </div>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="border rounded-lg p-12 text-center">
          <p className="text-body-sm text-text-secondary">Loading bookings...</p>
        </div>
      ) : (
        <BookingTable
          bookings={bookings}
          onStatusUpdate={handleStatusUpdate}
          onCancel={handleCancel}
          onReschedule={handleReschedule}
          loading={loading}
        />
      )}

      <BookingFormModal
        providerId={providerId}
        services={services}
        staff={staff}
        open={isBookingModalOpen}
        onOpenChange={setIsBookingModalOpen}
        onSuccess={handleBookingCreated}
      />

      {selectedBookingForReschedule && (
        <RescheduleBookingModal
          booking={selectedBookingForReschedule}
          providerId={providerId}
          open={isRescheduleModalOpen}
          onOpenChange={setIsRescheduleModalOpen}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  )
}
