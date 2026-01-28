'use client'

import { useState } from 'react'
import { ProviderNav } from './provider-nav'
import { DashboardHeader } from './dashboard-header'
import type { AccessContext } from '@/lib/staff-helpers-client'

interface ProviderLayoutClientProps {
  businessName: string
  accessContext: AccessContext
  userId: string
  children: React.ReactNode
}

export function ProviderLayoutClient({
  businessName,
  accessContext,
  userId,
  children,
}: ProviderLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <ProviderNav
        businessName={businessName}
        accessContext={accessContext}
        userId={userId}
        mobileMenuOpen={mobileMenuOpen}
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      <div className="flex-1 flex flex-col lg:ml-64">
        <DashboardHeader
          businessName={businessName}
          accessContext={accessContext}
          userId={userId}
          mobileMenuOpen={mobileMenuOpen}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto px-4 py-4 lg:py-6 lg:container">{children}</div>
        </main>
      </div>
    </div>
  )
}
