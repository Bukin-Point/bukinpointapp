'use client'

import { useState, useEffect } from 'react'
import { Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createService, updateService } from '@/actions/services'

interface ServiceFormProps {
  providerId: string
  service?: Service
  onSuccess: (service: Service) => void
  onCancel: () => void
}

export function ServiceForm({ providerId, service, onSuccess, onCancel }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
        duration: service.duration.toString(),
        price: service.price.toString(),
        isActive: service.isActive,
      })
    }
  }, [service])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = service
        ? await updateService(service.id, {
            ...formData,
            duration: parseInt(formData.duration),
            price: parseFloat(formData.price),
          })
        : await createService({
            ...formData,
            providerId,
            duration: parseInt(formData.duration),
            price: parseFloat(formData.price),
          })

      if (result.error) {
        setError(result.error)
      } else if (result.service) {
        onSuccess(result.service)
      }
    } catch (err) {
      setError('An unexpected error occurred')
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
    <Card>
      <CardHeader>
        <CardTitle>{service ? 'Edit Service' : 'Create Service'}</CardTitle>
        <CardDescription>
          {service ? 'Update service details' : 'Add a new service to your offerings'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
