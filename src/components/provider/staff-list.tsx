'use client'

import { useState } from 'react'
import { StaffMember, Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StaffForm } from '@/components/provider/staff-form'
import { deleteStaff, toggleStaffStatus } from '@/actions/staff'
import { Plus, Trash2, UserX, UserCheck } from 'lucide-react'

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
  const [staff, setStaff] = useState(initialStaff)
  const [editingStaff, setEditingStaff] = useState<StaffWithRelations | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return
    }

    setLoading(staffId)
    try {
      const result = await deleteStaff(staffId)
      if (result.success) {
        setStaff((prev) => prev.filter((s) => s.id !== staffId))
      } else {
        alert(result.error || 'Failed to delete staff member')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
    setLoading(staffId)
    try {
      const result = await toggleStaffStatus(staffId, !currentStatus)
      if (result.success) {
        setStaff((prev) =>
          prev.map((s) => (s.id === staffId ? { ...s, isActive: !currentStatus } : s))
        )
      } else {
        alert(result.error || 'Failed to update staff status')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setLoading(null)
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
                    onClick={() => handleToggleStatus(member.id, member.isActive)}
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
                    onClick={() => handleDelete(member.id)}
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
    </div>
  )
}
