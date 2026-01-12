'use client'

import { useState, useMemo } from 'react'
import { StaffMember } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'

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

interface StaffTableProps {
  staff: StaffWithRelations[]
  onViewDetails: (staff: StaffWithRelations) => void
  onEdit: (staff: StaffWithRelations) => void
  onDelete: (staff: StaffWithRelations) => void
  onToggleStatus: (staff: StaffWithRelations) => void
  loading?: string | null
}

type SortField = 'name' | 'email' | 'role' | 'status' | null
type SortDirection = 'asc' | 'desc'

export function StaffTable({
  staff,
  onViewDetails,
  onEdit,
  onDelete,
  onToggleStatus,
  loading,
}: StaffTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)

  const sortedStaff = useMemo(() => {
    if (!sortField) return staff

    const sorted = [...staff].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
          break
        case 'email':
          comparison = a.user.email.localeCompare(b.user.email)
          break
        case 'role':
          comparison = a.role.localeCompare(b.role)
          break
        case 'status':
          comparison = a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [staff, sortField, sortDirection])

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

  if (staff.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-body-sm text-text-secondary">No staff members found.</p>
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
                <SortButton field="name">Name</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary hidden md:table-cell whitespace-nowrap">
                <SortButton field="email">Email</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="role">Role</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary hidden lg:table-cell whitespace-nowrap">
                Assigned Services
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
            {sortedStaff.map((member) => {
              const isActionMenuOpen = openActionMenu === member.id
              const serviceCount = member.services.length

              return (
                <tr
                  key={member.id}
                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(member)}
                >
                  <td className="p-3 text-body-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{member.user.name || 'No name'}</span>
                      <span className="text-text-secondary text-caption md:hidden">
                        {member.user.email}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-body-sm hidden md:table-cell">
                    <span>{member.user.email}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant={member.role === 'OWNER' ? 'default' : 'outline'}>
                      {member.role}
                    </Badge>
                  </td>
                  <td className="p-3 text-body-sm hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {serviceCount > 0 ? (
                        <>
                          {member.services.slice(0, 2).map(({ service }) => (
                            <Badge key={service.id} variant="outline" className="text-xs">
                              {service.name}
                            </Badge>
                          ))}
                          {serviceCount > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{serviceCount - 2} more
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-text-secondary text-caption">None</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={member.isActive ? 'default' : 'secondary'}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <Popover
                        open={isActionMenuOpen}
                        onOpenChange={(open) => setOpenActionMenu(open ? member.id : null)}
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
                                onViewDetails(member)
                                setOpenActionMenu(null)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                onEdit(member)
                                setOpenActionMenu(null)
                              }}
                              disabled={loading === member.id}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                onToggleStatus(member)
                                setOpenActionMenu(null)
                              }}
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
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-destructive hover:text-destructive"
                              onClick={() => {
                                onDelete(member)
                                setOpenActionMenu(null)
                              }}
                              disabled={loading === member.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
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
