'use client'

import { useState } from 'react'
import { Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ServiceForm } from '@/components/provider/service-form'
import { deleteService } from '@/actions/services'
import { Plus, Trash2, Edit } from 'lucide-react'

interface ServiceListProps {
  services: Service[]
  providerId: string
  canEdit?: boolean
}

export function ServiceList({ services: initialServices, providerId, canEdit = true }: ServiceListProps) {
  const [services, setServices] = useState(initialServices)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showForm, setShowForm] = useState(false)
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
      } else {
        alert(result.error || 'Failed to delete service')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setShowForm(true)
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
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => {
            setEditingService(null)
            setShowForm(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
      )}

      {canEdit && showForm && (
        <ServiceForm
          providerId={providerId}
          service={editingService || undefined}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditingService(null)
          }}
        />
      )}

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-body-sm text-text-secondary">
              No services yet. Create your first service to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-h4">{service.name}</CardTitle>
                  <Badge variant={service.isActive ? 'default' : 'secondary'}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {service.description && (
                  <CardDescription>{service.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Duration:</span>
                    <span className="font-medium">{service.duration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Price:</span>
                    <span className="font-medium">
                      ₦{Number(service.price).toLocaleString()}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      disabled={loading === service.id}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {loading === service.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
