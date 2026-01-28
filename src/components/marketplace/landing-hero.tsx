'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Calendar, Users, Shield, Clock } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-surface py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Main Heading */}
          <h1 className="text-h1 mb-6 font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Booking Services Online
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>

          {/* Subheading */}
          <p className="mb-8 text-lg text-text-secondary sm:text-xl lg:text-2xl">
            Discover trusted service providers in your area. Book appointments instantly, manage
            your schedule, and get the services you need all in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="#services">
                Browse Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/signup?type=provider">Become a Provider</Link>
            </Button>
          </div>

          {/* Features Grid */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-h4 font-semibold">Easy Booking</h3>
              <p className="text-body-sm text-text-secondary">
                Book appointments in just a few clicks
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-h4 font-semibold">Real-Time Availability</h3>
              <p className="text-body-sm text-text-secondary">See available slots instantly</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-h4 font-semibold">Trusted Providers</h3>
              <p className="text-body-sm text-text-secondary">
                Verified businesses and professionals
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary/10 p-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-h4 font-semibold">Secure & Safe</h3>
              <p className="text-body-sm text-text-secondary">
                Your data and payments are protected
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
