'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, MapPin } from 'lucide-react'
import type { MarketplaceService } from '@/actions/marketplace'

const DEFAULT_IMAGE = '/bukinpoint.jpeg'

interface ServiceCardProps {
  service: MarketplaceService
}

export function ServiceCard({ service }: ServiceCardProps) {
  const bookingUrl = `/book/${service.provider.id}?serviceId=${service.id}`
  const serviceImage = service.image || DEFAULT_IMAGE

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
      <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
        <Image
          src={serviceImage}
          alt={service.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-200"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-h4 mb-2 line-clamp-2">{service.name}</CardTitle>
            <div className="flex items-center gap-2 text-body-sm text-text-secondary mb-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{service.provider.businessName}</span>
            </div>
            <div className="flex items-center gap-2 text-body-sm text-text-secondary">
              <span className="text-text-secondary">{service.provider.industry}</span>
            </div>
          </div>
        </div>
        {service.description && (
          <CardDescription className="line-clamp-2 mt-2">{service.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-body-sm">
              <Clock className="h-4 w-4 text-text-secondary" />
              <span className="text-text-secondary">{service.duration} min</span>
            </div>
            <div className="text-h4 font-semibold">
              ₦{service.price.toLocaleString()}
            </div>
          </div>
        </div>
        <Button asChild className="w-full" size="lg">
          <Link href={bookingUrl}>Book Now</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
