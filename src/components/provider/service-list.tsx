'use client'

import { useState } from 'react'
import { Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { ServiceTable } from '@/components/provider/service-table'
import { ServiceDetailsModal } from '@/components/provider/service-details-modal'
import { ServiceFormModal } from '@/components/provider/service-form-modal'
import { deleteService } from '@/actions/services'
import { Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ServiceListProps {
  services: Service[]
  providerId: string
  canEdit?: boolean
}

export function ServiceList({ services: initialServices, providerId, canEdit = true }: ServiceListProps) {
  const { toast } = useToast()
  const [services, setServices] = useState(initialServices)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return
    }

    setLoading(serviceId)
    try {
      const result = await deleteService(serviceId)
      if (result.success) {
        setServices((prev) => prev.filter((s) => s.id !== serviceId))
        toast({
          title: 'Success',
          description: 'Service deleted successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete service',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the service',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const handleViewDetails = (service: Service) => {
    setSelectedService(service)
    setIsDetailsModalOpen(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setIsFormModalOpen(true)
  }

  const handleCreate = () => {
    setEditingService(null)
    setIsFormModalOpen(true)
  }

  const handleFormSuccess = (newService: Service) => {
    if (editingService) {
      setServices((prev) =>
        prev.map((s) => (s.id === newService.id ? newService : s))
      )
      setEditingService(null)
    } else {
      setServices((prev) => [newService, ...prev])
    }
    setIsFormModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
      )}

      <ServiceTable
        services={services}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        canEdit={canEdit}
      />

      <ServiceDetailsModal
        service={selectedService}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        onEdit={handleEdit}
        canEdit={canEdit}
      />

      {canEdit && (
        <ServiceFormModal
          providerId={providerId}
          service={editingService}
          open={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
