'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Serialized Service type with price as number instead of Decimal
type SerializedService = Omit<import('@prisma/client').Service, 'price'> & {
  price: number
}

interface ServiceSelectorProps {
  services: SerializedService[]
  onSelect: (service: SerializedService) => void
}

export function ServiceSelector({ services, onSelect }: ServiceSelectorProps) {
  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-body-sm text-text-secondary">
            No services available at this time.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a Service</CardTitle>
        <CardDescription>Choose the service you'd like to book</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Card
              key={service.id}
              className="card-interactive cursor-pointer"
              onClick={() => onSelect(service)}
            >
              <CardHeader>
                <CardTitle className="text-h4">{service.name}</CardTitle>
                {service.description && (
                  <CardDescription>{service.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-body-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Duration:</span>
                      <span className="font-medium">{service.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Price:</span>
                      <span className="font-medium">
                        ₦{service.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button>Select</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
