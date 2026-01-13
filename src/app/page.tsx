import { ServiceMarketplace } from '@/components/marketplace/service-marketplace'
import { HomeHeader } from '@/components/marketplace/home-header'
import { LandingHero } from '@/components/marketplace/landing-hero'
import { Footer } from '@/components/marketplace/footer'
import { getMarketplaceServices, getMarketplaceIndustries } from '@/actions/marketplace'

export const metadata = {
  title: 'BukinPoint - Book Services Online',
  description: 'Discover and book services from trusted providers in your area',
}

export default async function HomePage() {
  const [providers, industries] = await Promise.all([
    getMarketplaceServices(),
    getMarketplaceIndustries(),
  ])

  return (
    <div className="min-h-screen bg-surface">
      <HomeHeader />
      <LandingHero />
      <div id="services" className="container mx-auto px-4 py-8 lg:py-12">
        <ServiceMarketplace initialProviders={providers} industries={industries} />
      </div>
      <Footer />
    </div>
  )
}
