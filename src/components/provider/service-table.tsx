'use client'

import { useState, useMemo } from 'react'
import { SerializedService } from './service-list'
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
} from 'lucide-react'
import Image from 'next/image'

interface ServiceTableProps {
  services: SerializedService[]
  onViewDetails: (service: SerializedService) => void
  onEdit: (service: SerializedService) => void
  onDelete: (serviceId: string) => void
  loading?: string | null
  canEdit?: boolean
}

type SortField = 'name' | 'price' | 'duration' | 'status' | null
type SortDirection = 'asc' | 'desc'

const DEFAULT_IMAGE = '/bukinpoint.jpeg'

export function ServiceTable({
  services,
  onViewDetails,
  onEdit,
  onDelete,
  loading,
  canEdit = true,
}: ServiceTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)

  const sortedServices = useMemo(() => {
    if (!sortField) return services

    const sorted = [...services].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = Number(a.price) - Number(b.price)
          break
        case 'duration':
          comparison = a.duration - b.duration
          break
        case 'status':
          comparison = a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [services, sortField, sortDirection])

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

  if (services.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-body-sm text-text-secondary">No services found.</p>
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
                Image
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="name">Service Name</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary hidden md:table-cell whitespace-nowrap">
                Description
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="duration">Duration</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="price">Price</SortButton>
              </th>
              <th className="text-left p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                <SortButton field="status">Status</SortButton>
              </th>
              {canEdit && (
                <th className="text-right p-3 text-body-sm font-semibold text-text-secondary whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedServices.map((service) => {
              const serviceImage = service.image || DEFAULT_IMAGE
              const isActionMenuOpen = openActionMenu === service.id

              return (
                <tr
                  key={service.id}
                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(service)}
                >
                  <td className="p-3">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted">
                      <Image
                        src={serviceImage}
                        alt={service.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  </td>
                  <td className="p-3 text-body-sm">
                    <span className="font-medium">{service.name}</span>
                  </td>
                  <td className="p-3 text-body-sm hidden md:table-cell">
                    <span className="text-text-secondary line-clamp-2">
                      {service.description || 'No description'}
                    </span>
                  </td>
                  <td className="p-3 text-body-sm">
                    <span>{service.duration} min</span>
                  </td>
                  <td className="p-3 text-body-sm">
                    <span className="font-medium">
                      ₦{Number(service.price).toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge variant={service.isActive ? 'default' : 'secondary'}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {canEdit && (
                    <td className="p-3">
                      <div className="flex justify-end">
                        <Popover
                          open={isActionMenuOpen}
                          onOpenChange={(open) => setOpenActionMenu(open ? service.id : null)}
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
                                  onViewDetails(service)
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
                                  onEdit(service)
                                  setOpenActionMenu(null)
                                }}
                                disabled={loading === service.id}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-destructive hover:text-destructive"
                                onClick={() => {
                                  onDelete(service.id)
                                  setOpenActionMenu(null)
                                }}
                                disabled={loading === service.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
