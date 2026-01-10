'use client'

import { useState, useEffect } from 'react'
import { StaffMember, Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createStaff, updateStaff } from '@/actions/staff'

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

interface StaffFormProps {
  providerId: string
  services: Service[]
  staff?: StaffWithRelations
  onSuccess: () => void
  onCancel: () => void
}

export function StaffForm({ providerId, services, staff, onSuccess, onCancel }: StaffFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'STAFF' as 'OWNER' | 'STAFF',
    serviceIds: [] as string[],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (staff) {
      setFormData({
        email: staff.user.email,
        role: staff.role,
        serviceIds: staff.services.map((s) => s.service.id),
      })
    }
  }, [staff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = staff
        ? await updateStaff(staff.id, {
            role: formData.role,
            serviceIds: formData.serviceIds,
          })
        : await createStaff({
            providerId,
            email: formData.email,
            role: formData.role,
            serviceIds: formData.serviceIds,
          })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{staff ? 'Edit Staff Member' : 'Add Staff Member'}</CardTitle>
        <CardDescription>
          {staff ? 'Update staff member details' : 'Invite a team member by email'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}
          {!staff && (
            <div className="space-y-2">
              <label htmlFor="email" className="text-body-sm font-medium">
                Email Address *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="staff@example.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                disabled={loading}
              />
              <p className="text-caption">
                The staff member will need to sign up with this email address
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="role" className="text-body-sm font-medium">
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value as 'OWNER' | 'STAFF' }))
              }
              required
              disabled={loading}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="STAFF">Staff</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-body-sm font-medium">Assign Services</label>
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
              {services.length === 0 ? (
                <p className="text-caption">No services available. Create services first.</p>
              ) : (
                services.map((service) => (
                  <label key={service.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.serviceIds.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                      disabled={loading}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-body-sm">{service.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : staff ? 'Update Staff' : 'Add Staff Member'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
