'use client'

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Building2, CheckCircle2 } from 'lucide-react'
import type { Provider, StaffMember } from '@prisma/client'
import { ServiceCard } from '@/components/marketplace/service-card'
import { Footer } from '@/components/marketplace/footer'
import type { MarketplaceService } from '@/actions/marketplace'

const DEFAULT_IMAGE = '/bukinpoint.jpeg'

// Serialized Service type with price as number instead of Decimal
type SerializedService = Omit<import('@prisma/client').Service, 'price'> & {
  price: number
}

type ProviderWithRelations = Provider & {
  services: SerializedService[]
  staff: (StaffMember & {
    user: {
      name: string | null
      email: string
    }
    services: Array<{
      service: SerializedService
    }>
  })[]
}

interface ProviderLandingProps {
  provider: ProviderWithRelations
}

export function ProviderLanding({ provider }: ProviderLandingProps) {
  const providerImage = provider.businessImage || DEFAULT_IMAGE

  // Transform services to match MarketplaceService format for reuse of ServiceCard
  const marketplaceServices: MarketplaceService[] = provider.services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    image: service.image,
    duration: service.duration,
    price: service.price,
    provider: {
      id: provider.id,
      businessName: provider.businessName,
      industry: provider.industry,
      subdomain: provider.subdomain,
    },
  }))

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section with Provider Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-surface py-12 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center space-y-6">
              {/* Provider Image */}
              <div className="relative mx-auto w-40 h-40 lg:w-48 lg:h-48 rounded-full overflow-hidden border-4 border-background shadow-xl ring-4 ring-primary/20">
                <Image
                  src={providerImage}
                  alt={provider.businessName}
                  fill
                  className="object-cover"
                  sizes="192px"
                  priority
                />
              </div>

              {/* Business Name and Badge */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-h1 lg:text-5xl font-bold tracking-tight">{provider.businessName}</h1>
                  <CheckCircle2 className="h-6 w-6 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
                </div>
                <Badge variant="outline" className="text-body-sm lg:text-base px-4 py-1.5">
                  {provider.industry}
                </Badge>
              </div>

              {/* Contact Information */}
              {(provider.address || provider.phone || provider.email) && (
                <div className="flex flex-wrap items-center justify-center gap-6 text-body-sm lg:text-base text-text-secondary pt-2">
                  {provider.address && (
                    <div className="flex items-center gap-2 bg-background/60 backdrop-blur-sm px-4 py-2 rounded-full">
                      <MapPin className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                      <span className="font-medium">{provider.address}</span>
                    </div>
                  )}
                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-2 bg-background/60 backdrop-blur-sm px-4 py-2 rounded-full hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                      <span className="font-medium">{provider.phone}</span>
                    </a>
                  )}
                  {provider.email && (
                    <a
                      href={`mailto:${provider.email}`}
                      className="flex items-center gap-2 bg-background/60 backdrop-blur-sm px-4 py-2 rounded-full hover:text-primary transition-colors"
                    >
                      <Mail className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                      <span className="font-medium">{provider.email}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="flex-1 py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 lg:mb-12 text-center">
              <h2 className="text-h2 lg:text-4xl font-bold mb-3">Our Services</h2>
              <p className="text-body-sm lg:text-lg text-text-secondary max-w-2xl mx-auto">
                Choose a service to book an appointment with us. We're here to serve you with excellence.
              </p>
            </div>

            {marketplaceServices.length === 0 ? (
              <Card className="max-w-md mx-auto">
                <CardContent className="py-16 text-center">
                  <div className="mb-6">
                    <Building2 className="h-16 w-16 mx-auto text-text-secondary/50" />
                  </div>
                  <h3 className="text-h4 font-semibold mb-2">No Services Available</h3>
                  <p className="text-body-sm text-text-secondary">
                    We're currently updating our service offerings. Please check back soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marketplaceServices.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
