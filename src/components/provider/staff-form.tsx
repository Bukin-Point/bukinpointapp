'use client'

import { useState, useEffect } from 'react'
import { UserProvider, Service } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createStaff, updateStaff } from '@/actions/staff'
import { sendStaffInvitation } from '@/actions/staff-invitations'
import { useToast } from '@/hooks/use-toast'
import { Copy, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

type UserProviderWithRelations = UserProvider & {
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

// Serialized Service type with price as number instead of Decimal
type SerializedService = Omit<Service, 'price'> & {
  price?: number
}

interface StaffFormProps {
  providerId: string
  services: SerializedService[]
  staff?: UserProviderWithRelations
  onSuccess: () => void
  onCancel: () => void
}

export function StaffForm({ providerId, services, staff, onSuccess, onCancel }: StaffFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    role: 'STAFF' as 'OWNER' | 'STAFF',
    serviceIds: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invitationUrl, setInvitationUrl] = useState('')
  const [invitationEmail, setInvitationEmail] = useState('')
  const [isDevelopment, setIsDevelopment] = useState(false)
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (staff) {
      const roleName = staff.roles[0]?.role.name === 'OWNER' ? 'OWNER' : 'STAFF'

      setFormData({
        email: staff.user.email,
        role: roleName,
        serviceIds: staff.services.map((s) => s.service.id),
      })
    }
  }, [staff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (staff) {
        // Update existing staff
        const result = await updateStaff(staff.id, {
          role: formData.role,
          serviceIds: formData.serviceIds,
        })

        if (result.error) {
          setError(result.error)
        } else {
          toast({
            title: 'Staff Updated',
            description: 'Staff member details have been updated.',
          })
          onSuccess()
        }
      } else {
        // Send invitation for new staff
        const result = await sendStaffInvitation({
          providerId,
          email: formData.email,
          role: formData.role,
          serviceIds: formData.serviceIds,
        })

        if (result.error) {
          setError(result.error)
        } else {
          // Show modal if email failed OR in development mode
          const shouldShowModal = !result.emailSent || result.isDevelopment

          if (shouldShowModal) {
            // Show modal with invitation link
            setInvitationUrl(result.invitationUrl || '')
            setInvitationEmail(formData.email)
            setIsDevelopment(result.isDevelopment || false)
            setShowInvitationModal(true)
            // Don't call onSuccess yet - wait for modal close
          } else {
            // Email sent successfully in production
            toast({
              title: 'Invitation Sent',
              description: `An invitation has been sent to ${formData.email}. They will receive an email with a signup link.`,
            })
            onSuccess()
          }
        }
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

  const handleCopyLink = async () => {
    if (!invitationUrl) {
      toast({
        title: 'No Link Available',
        description: 'Invitation link is not available.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Try modern Clipboard API first (requires secure context)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(invitationUrl)
        setCopied(true)
        toast({
          title: 'Link Copied',
          description: 'Invitation link has been copied to clipboard.',
        })
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback: Use execCommand for non-secure contexts
        const textArea = document.createElement('textarea')
        textArea.value = invitationUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          const successful = document.execCommand('copy')
          if (successful) {
            setCopied(true)
            toast({
              title: 'Link Copied',
              description: 'Invitation link has been copied to clipboard.',
            })
            setTimeout(() => setCopied(false), 2000)
          } else {
            throw new Error('execCommand failed')
          }
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      console.error('Copy failed:', err)
      // Fallback: Select the text in the input so user can manually copy
      const input = document.querySelector('input[readonly][value="' + invitationUrl + '"]') as HTMLInputElement
      if (input) {
        input.select()
        input.setSelectionRange(0, invitationUrl.length)
        toast({
          title: 'Select and Copy',
          description: 'Link is selected. Press Ctrl+C (or Cmd+C on Mac) to copy.',
        })
      } else {
        toast({
          title: 'Copy Failed',
          description: 'Failed to copy link. Please copy it manually from the input field.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleModalClose = () => {
    setShowInvitationModal(false)
    setInvitationUrl('')
    setInvitationEmail('')
    setIsDevelopment(false)
    setCopied(false)
    onSuccess()
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
          {staff ? (
            <div className="space-y-2">
              <label htmlFor="email" className="text-body-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-caption text-text-secondary">
                Email cannot be changed
              </p>
            </div>
          ) : (
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
                An invitation email will be sent to this address with a signup link
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
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {staff ? 'Updating...' : 'Sending...'}
              </>
            ) : staff ? (
              'Update Staff'
            ) : (
              'Send Invitation'
            )}
          </Button>
        </CardFooter>
      </form>

      {/* Invitation Link Modal */}
      <Dialog open={showInvitationModal} onOpenChange={setShowInvitationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Invitation Link</DialogTitle>
            <DialogDescription>
              {invitationEmail ? (
                <>
                  Invitation created for <strong>{invitationEmail}</strong>.
                  {isDevelopment ? (
                    <span className="block mt-2 text-sm text-amber-600">
                      Development Mode: Email sent to dev email. Copy the link below to share with staff.
                    </span>
                  ) : (
                    <span className="block mt-2">Copy the link below to share it.</span>
                  )}
                </>
              ) : (
                'Copy the invitation link below to share it with your staff member.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={invitationUrl}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-text-secondary">
              This invitation link expires in 7 days. Share it with your staff member so they can sign up.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleModalClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
