'use client'

import { useState, useMemo } from 'react'
import { UserProvider } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

type StaffWithRelations = UserProvider & {
  user: {
    id: string
    name: string | null
    email: string
  }
  roles: Array<{
    role: {
      name: string
    }
  }>
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
        case 'role': {
          const roleA = a.isOwner ? 'OWNER' : (a.roles[0]?.role.name || 'STAFF')
          const roleB = b.isOwner ? 'OWNER' : (b.roles[0]?.role.name || 'STAFF')
          comparison = roleA.localeCompare(roleB)
          break
        }
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

  const getRoleName = (member: StaffWithRelations) => {
    if (member.isOwner) return 'OWNER'
    return member.roles[0]?.role.name || 'STAFF'
  }

  if (staff.length === 0) {
    return (
      <div className="border rounded-lg p-8 sm:p-12 text-center">
        <p className="text-body-sm text-text-secondary">No staff members found.</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {sortedStaff.map((member) => {
          const roleName = getRoleName(member)
          return (
            <div
              key={member.id}
              className="border rounded-lg p-3 flex gap-3 items-center bg-card cursor-pointer"
              onClick={() => onViewDetails(member)}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-body-sm">{member.user.name || 'No name'}</p>
                <p className="text-caption text-text-secondary truncate">{member.user.email}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant={member.isOwner ? 'default' : 'outline'} className="text-xs">{roleName}</Badge>
                  <Badge variant={member.isActive ? 'default' : 'secondary'} className="text-xs">{member.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(member) }}>
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(member) }} disabled={loading === member.id}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(member) }} disabled={loading === member.id}>
                    {member.isActive ? <><UserX className="mr-2 h-4 w-4" /> Deactivate</> : <><UserCheck className="mr-2 h-4 w-4" /> Activate</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(member) }} disabled={loading === member.id} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
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
                const serviceCount = member.services.length
                const roleName = getRoleName(member)

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
                      <Badge variant={member.isOwner ? 'default' : 'outline'}>
                        {roleName}
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
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onViewDetails(member)}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(member)} disabled={loading === member.id}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleStatus(member)} disabled={loading === member.id}>
                              {member.isActive ? <><UserX className="mr-2 h-4 w-4" /> Deactivate</> : <><UserCheck className="mr-2 h-4 w-4" /> Activate</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(member)} disabled={loading === member.id} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
