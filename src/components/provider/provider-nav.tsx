'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Briefcase, Users, Clock, Wallet, LogOut, Menu, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { AccessContext, canManageStaff, isStaff } from '@/lib/staff-helpers-client'
import { ProviderSelector } from './provider-selector'
import { useProviderContext } from '@/store/provider-context'

// Component to preserve providerId in navigation links
function NavLink({
  href,
  isActive,
  onClick,
  children,
}: {
  href: string
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const selectedProviderId = useProviderContext((state) => state.selectedProviderId)
  const finalHref = selectedProviderId ? `${href}?providerId=${selectedProviderId}` : href

  return (
    <Link
      href={finalHref}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {children}
    </Link>
  )
}

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, requiresOwner: false },
  { href: '/bookings', label: 'Bookings', icon: Calendar, requiresOwner: false },
  { href: '/services', label: 'Services', icon: Briefcase, requiresOwner: false },
  { href: '/staff', label: 'Staff', icon: Users, requiresOwner: true },
  { href: '/availability', label: 'Availability', icon: Clock, requiresOwner: false },
  { href: '/wallet', label: 'Wallet', icon: Wallet, requiresOwner: true },
  { href: '/settings', label: 'Settings', icon: Settings, requiresOwner: true },
]

export function ProviderNav({
  businessName,
  accessContext,
  userId,
  mobileMenuOpen: externalMobileMenuOpen,
  onMenuToggle: externalOnMenuToggle,
}: {
  businessName: string
  accessContext: AccessContext
  userId: string
  mobileMenuOpen?: boolean
  onMenuToggle?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)
  
  // Use external state if provided, otherwise use internal state
  const mobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const setMobileMenuOpen = externalOnMenuToggle || (() => setInternalMobileMenuOpen(!internalMobileMenuOpen))

  const handleSignOut = async () => {
    await signOut()
    router.push('/signin')
  }

  // Filter nav items based on permissions
  const navItems = allNavItems.filter((item) => {
    if (item.requiresOwner) {
      return canManageStaff(accessContext)
    }
    return true
  })

  const userIsStaff = isStaff(accessContext)

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-card p-4 lg:hidden">
        <div className="flex-1 min-w-0 mr-2">
          <ProviderSelector userId={userId} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => {
            if (externalOnMenuToggle) {
              externalOnMenuToggle()
            } else {
              setInternalMobileMenuOpen(false)
            }
          }}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:block`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b p-6 pt-16 lg:pt-6">
            <div className="mb-2">
              <ProviderSelector userId={userId} />
            </div>
            <h2 className="text-h4 font-semibold">{businessName}</h2>
            <p className="text-caption text-text-secondary">
              {userIsStaff ? 'Staff Portal' : 'Provider Portal'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  isActive={isActive}
                  onClick={() => {
                    if (externalOnMenuToggle) {
                      externalOnMenuToggle()
                    } else {
                      setInternalMobileMenuOpen(false)
                    }
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Footer with Logout */}
          <div className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-text-secondary hover:bg-accent hover:text-accent-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
