'use client'

import { Service } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Clock, DollarSign, FileText, CheckCircle, XCircle, Edit } from 'lucide-react'

interface ServiceDetailsModalProps {
  service: Service | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (service: Service) => void
  canEdit?: boolean
}

const DEFAULT_IMAGE = '/bukinpoint.jpeg'

export function ServiceDetailsModal({
  service,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: ServiceDetailsModalProps) {
  if (!service) return null

  const serviceImage = service.image || DEFAULT_IMAGE

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-h3">{service.name}</DialogTitle>
              <DialogDescription className="mt-1">
                Service ID: <span className="font-mono">{service.id}</span>
              </DialogDescription>
            </div>
            <Badge variant={service.isActive ? 'default' : 'secondary'}>
              {service.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Service Image */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold">Service Image</h3>
            <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted">
              <Image
                src={serviceImage}
                alt={service.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4" />
                  Duration
                </span>
                <p className="font-medium">{service.duration} minutes</p>
              </div>
              <div>
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4" />
                  Price
                </span>
                <p className="font-medium">₦{Number(service.price).toLocaleString()}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-text-secondary flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4" />
                  Description
                </span>
                <p className="font-medium whitespace-pre-wrap">
                  {service.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <h3 className="text-h4 font-semibold">Status</h3>
            <div className="flex items-center gap-2">
              {service.isActive ? (
                <>
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-body-sm">This service is currently active and available for booking</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-error" />
                  <span className="text-body-sm">This service is inactive and not available for booking</span>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canEdit && (
            <Button
              onClick={() => {
                onEdit(service)
                onOpenChange(false)
              }}
              className="flex-1 sm:flex-initial"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Service
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
