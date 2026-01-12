'use client'

import { useState } from 'react'
import { StaffMember, Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { StaffTable } from '@/components/provider/staff-table'
import { StaffDetailsModal } from '@/components/provider/staff-details-modal'
import { StaffFormModal } from '@/components/provider/staff-form-modal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteStaff, toggleStaffStatus } from '@/actions/staff'
import { Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type StaffWithRelations = StaffMember & {
  user: {
    id: string
    name: string | null
    email: string
  }
  services: Array<{
    service: {
      id: string
      name: string
    }
  }>
}

interface StaffListProps {
  staff: StaffWithRelations[]
  services: Service[]
  providerId: string
}

export function StaffList({ staff: initialStaff, services, providerId }: StaffListProps) {
  const { toast } = useToast()
  const [staff, setStaff] = useState(initialStaff)
  const [selectedStaff, setSelectedStaff] = useState<StaffWithRelations | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffWithRelations | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [staffToAction, setStaffToAction] = useState<StaffWithRelations | null>(null)

  const handleDeleteClick = (member: StaffWithRelations) => {
    setStaffToAction(member)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!staffToAction) return

    setLoading(staffToAction.id)
    setDeleteDialogOpen(false)
    try {
      const result = await deleteStaff(staffToAction.id)
      if (result.success) {
        setStaff((prev) => prev.filter((s) => s.id !== staffToAction.id))
        toast({
          title: 'Success',
          description: 'Staff member removed successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove staff member',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
      setStaffToAction(null)
    }
  }

  const handleToggleStatusClick = (member: StaffWithRelations) => {
    setStaffToAction(member)
    if (member.isActive) {
      setDeactivateDialogOpen(true)
    } else {
      setActivateDialogOpen(true)
    }
  }

  const handleToggleStatus = async () => {
    if (!staffToAction) return

    const newStatus = !staffToAction.isActive
    setLoading(staffToAction.id)
    setDeactivateDialogOpen(false)
    setActivateDialogOpen(false)
    try {
      const result = await toggleStaffStatus(staffToAction.id, newStatus)
      if (result.success) {
        setStaff((prev) =>
          prev.map((s) => (s.id === staffToAction.id ? { ...s, isActive: newStatus } : s))
        )
        toast({
          title: 'Success',
          description: `Staff member ${newStatus ? 'activated' : 'deactivated'} successfully`,
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update staff status',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
      setStaffToAction(null)
    }
  }

  const handleViewDetails = (member: StaffWithRelations) => {
    setSelectedStaff(member)
    setIsDetailsModalOpen(true)
  }

  const handleEdit = (member: StaffWithRelations) => {
    setEditingStaff(member)
    setIsFormModalOpen(true)
  }

  const handleCreate = () => {
    setEditingStaff(null)
    setIsFormModalOpen(true)
  }

  const handleFormSuccess = () => {
    // Reload to get updated data
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      <StaffTable
        staff={staff}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onToggleStatus={handleToggleStatusClick}
        loading={loading}
      />

      <StaffDetailsModal
        staff={selectedStaff}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={handleEdit}
        canEdit={true}
      />

      <StaffFormModal
        providerId={providerId}
        services={services}
        staff={editingStaff}
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {staffToAction?.user.name || staffToAction?.user.email} from your team?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setStaffToAction(null)
              }}
              disabled={loading === staffToAction?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading === staffToAction?.id}
            >
              {loading === staffToAction?.id ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {staffToAction?.user.name || staffToAction?.user.email}?
              They will no longer be able to access the dashboard, but you can reactivate them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeactivateDialogOpen(false)
                setStaffToAction(null)
              }}
              disabled={loading === staffToAction?.id}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleToggleStatus}
              disabled={loading === staffToAction?.id}
            >
              {loading === staffToAction?.id ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to activate {staffToAction?.user.name || staffToAction?.user.email}?
              They will regain access to the dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActivateDialogOpen(false)
                setStaffToAction(null)
              }}
              disabled={loading === staffToAction?.id}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleToggleStatus}
              disabled={loading === staffToAction?.id}
            >
              {loading === staffToAction?.id ? 'Activating...' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
