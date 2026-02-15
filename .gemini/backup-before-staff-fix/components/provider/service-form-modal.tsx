'use client'

import { useState, useEffect } from 'react'
import { SerializedService } from './service-list'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ImageUploader } from '@/components/ui/image-uploader'
import { createService, updateService } from '@/actions/services'
import { useToast } from '@/hooks/use-toast'

interface ServiceFormModalProps {
  providerId: string
  service?: SerializedService | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (service: SerializedService) => void
}

export function ServiceFormModal({
  providerId,
  service,
  open,
  onOpenChange,
  onSuccess,
}: ServiceFormModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    duration: '60',
    price: '',
    isActive: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        image: service.image || '',
        duration: service.duration.toString(),
        price: service.price.toString(),
        isActive: service.isActive,
      })
    } else {
      // Reset form for new service
      setFormData({
        name: '',
        description: '',
        image: '',
        duration: '60',
        price: '',
        isActive: true,
      })
    }
    setError('')
  }, [service, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = service
        ? await updateService(service.id, {
            name: formData.name,
            description: formData.description || undefined,
            image: formData.image.trim() !== '' ? formData.image : undefined,
            duration: parseInt(formData.duration),
            price: parseFloat(formData.price),
            isActive: formData.isActive,
          })
        : await createService({
            providerId,
            name: formData.name,
            description: formData.description || undefined,
            image: formData.image.trim() !== '' ? formData.image : undefined,
            duration: parseInt(formData.duration),
            price: parseFloat(formData.price),
            isActive: formData.isActive,
          })

      if (result.error) {
        setError(result.error)
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      } else if (result.service) {
        // Serialize service to convert Decimal price to number
        const serializedService: SerializedService = {
          ...result.service,
          price: typeof result.service.price === 'object' && 'toNumber' in result.service.price
            ? result.service.price.toNumber()
            : Number(result.service.price),
        }
        onSuccess(serializedService)
        onOpenChange(false)
        toast({
          title: 'Success',
          description: service ? 'Service updated successfully' : 'Service created successfully',
        })
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? 'Edit Service' : 'Create Service'}</DialogTitle>
          <DialogDescription>
            {service ? 'Update service details' : 'Add a new service to your offerings'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-error-light p-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-body-sm font-medium">
                Service Name *
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Haircut, Massage, Consultation"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-body-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Describe your service..."
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-body-sm font-medium">
                Service Image (Optional)
              </label>
              <ImageUploader
                value={formData.image || null}
                onChange={(url) => {
                  setFormData((prev) => ({
                    ...prev,
                    image: url || '',
                  }))
                }}
                providerId={providerId}
                serviceId={service?.id}
                maxSizeMB={2}
                disabled={loading}
              />
              <p className="text-caption text-text-secondary">
                Upload an image for this service. Leave empty to use default image.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="duration" className="text-body-sm font-medium">
                  Duration (minutes) *
                </label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="15"
                  step="15"
                  placeholder="60"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="price" className="text-body-sm font-medium">
                  Price (₦) *
                </label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="5000"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-body-sm font-medium">
                Service is active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
