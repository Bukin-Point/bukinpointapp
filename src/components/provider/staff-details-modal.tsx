'use client'

import { StaffMember } from '@prisma/client'
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
import { Mail, User, Briefcase, CheckCircle, XCircle, Edit } from 'lucide-react'

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

interface StaffDetailsModalProps {
  staff: StaffWithRelations | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (staff: StaffWithRelations) => void
  canEdit?: boolean
}

export function StaffDetailsModal({
  staff,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: StaffDetailsModalProps) {
  if (!staff) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-h3">
                {staff.user.name || staff.user.email}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Staff ID: <span className="font-mono">{staff.id}</span>
              </DialogDescription>
            </div>
            <Badge variant={staff.isActive ? 'default' : 'secondary'}>
              {staff.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Staff Information */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Staff Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <User className="h-4 w-4" />
                  Name
                </span>
                <p className="font-medium">{staff.user.name || 'No name provided'}</p>
              </div>
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4" />
                  Email
                </span>
                <p className="font-medium">{staff.user.email}</p>
              </div>
              <div>
                <span className="text-text-secondary mb-1">Role</span>
                <div className="mt-1">
                  <Badge variant={staff.role === 'OWNER' ? 'default' : 'outline'}>
                    {staff.role}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Services */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Assigned Services
            </h3>
            {staff.services.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {staff.services.map(({ service }) => (
                  <Badge key={service.id} variant="outline">
                    {service.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-text-secondary">No services assigned</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold">Status</h3>
            <div className="flex items-center gap-2">
              {staff.isActive ? (
                <>
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-body-sm">This staff member is currently active and can access the dashboard</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-error" />
                  <span className="text-body-sm">This staff member is inactive and cannot access the dashboard</span>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canEdit && (
            <Button
              onClick={() => {
                onEdit(staff)
                onOpenChange(false)
              }}
              className="flex-1 sm:flex-initial"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Staff
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
