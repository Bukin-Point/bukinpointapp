'use client'

import { useState } from 'react'
import { StaffMember, Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StaffForm } from '@/components/provider/staff-form'
import { deleteStaff, toggleStaffStatus } from '@/actions/staff'
import { Plus, Trash2, UserX, UserCheck, Edit } from 'lucide-react'
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
  clerkMembers?: Array<{
    id: string
    role: string
    publicUserData: {
      userId: string
      firstName?: string | null
      lastName?: string | null
      imageUrl?: string
      identifier: string
    }
  }>
}

export function StaffList({ staff: initialStaff, services, providerId, clerkMembers }: StaffListProps) {
  const { toast } = useToast()
  const [staff, setStaff] = useState(initialStaff)
  const [editingStaff, setEditingStaff] = useState<StaffWithRelations | null>(null)
  const [showForm, setShowForm] = useState(false)
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
          title: 'Staff Member Removed',
          description: `${staffToAction.user.name || staffToAction.user.email} has been removed from your team.`,
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
          title: newStatus ? 'Staff Member Activated' : 'Staff Member Deactivated',
          description: `${staffToAction.user.name || staffToAction.user.email} has been ${newStatus ? 'activated' : 'deactivated'}.`,
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => {
          setEditingStaff(null)
          setShowForm(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {showForm && (
        <StaffForm
          providerId={providerId}
          services={services}
          staff={editingStaff || undefined}
          onSuccess={() => {
            setShowForm(false)
            setEditingStaff(null)
            window.location.reload() // Refresh to get updated data
          }}
          onCancel={() => {
            setShowForm(false)
            setEditingStaff(null)
          }}
        />
      )}

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-body-sm text-text-secondary">
              No staff members yet. Add your first team member to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-h4">
                      {member.user.name || member.user.email}
                    </CardTitle>
                    <CardDescription>{member.user.email}</CardDescription>
                  </div>
                  <Badge variant={member.isActive ? 'default' : 'secondary'}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Role:</span>
                    <span className="font-medium">{member.role}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Assigned Services:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {member.services.length > 0 ? (
                        member.services.map(({ service }) => (
                          <Badge key={service.id} variant="outline" className="text-xs">
                            {service.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-caption">None</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingStaff(member)
                      setShowForm(true)
                    }}
                    disabled={loading === member.id}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatusClick(member)}
                    disabled={loading === member.id}
                  >
                    {member.isActive ? (
                      <>
                        <UserX className="mr-2 h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(member)}
                    disabled={loading === member.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {loading === member.id ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
