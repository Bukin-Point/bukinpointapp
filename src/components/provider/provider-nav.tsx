'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Calendar,
  Briefcase,
  Users,
  Clock,
  Wallet,
  LogOut,
  Menu,
  X,
  Settings,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { AccessContext, hasPermission, isStaff } from '@/lib/staff-helpers-client'
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
  const selectedProviderId = useProviderContext(state => state.selectedProviderId)
  const finalHref = selectedProviderId ? `${href}?providerId=${selectedProviderId}` : href

  return (
    <Link
      href={finalHref}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-colors ${isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
        }`}
    >
      {children}
    </Link>
  )
}

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, permission: 'view:dashboard' },
  { href: '/bookings', label: 'Bookings', icon: Calendar, permission: 'booking:read' },
  { href: '/services', label: 'Services', icon: Briefcase, permission: 'service:read' },
  { href: '/staff', label: 'Staff', icon: Users, permission: 'manage:users' },
  { href: '/availability', label: 'Availability', icon: Clock, permission: 'service:read' }, // Availability is usually tied to service/staff access
  { href: '/wallet', label: 'Wallet', icon: Wallet, permission: 'wallet:read' },
  { href: '/settings', label: 'Settings', icon: Settings, permission: 'manage:settings' },
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
  const mobileMenuOpen =
    externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen
  const toggleMobileMenu = externalOnMenuToggle || (() => setInternalMobileMenuOpen(prev => !prev))

  const handleSignOut = async () => {
    await signOut()
    router.push('/signin')
  }

  // Filter nav items based on permissions
  const navItems = allNavItems.filter(item => {
    return hasPermission(accessContext, item.permission)
  })

  const userIsStaff = isStaff(accessContext)

  return (
    <>
      {/* Mobile Menu Button */}
      {/* <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-card p-4 lg:hidden">
        <div className="flex-1 min-w-0 mr-2">
          <ProviderSelector userId={userId} />
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMobileMenu} aria-label="Toggle menu">
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div> */}

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
        className={`fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card transition-transform lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:block`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b p-6 pt-16 lg:pt-6">
            <div className="mb-2">
              <ProviderSelector userId={userId} />
            </div>
            <Link
              href="/"
              className="block group"
              onClick={() => {
                if (externalOnMenuToggle) {
                  externalOnMenuToggle()
                } else {
                  setInternalMobileMenuOpen(false)
                }
              }}
            >
              <h2 className="text-h4 font-semibold group-hover:text-primary group-hover:underline transition-all cursor-pointer">
                {businessName}
              </h2>
              <p className="text-caption text-text-secondary group-hover:text-primary/70 transition-colors">
                {userIsStaff ? 'Staff Portal' : 'Provider Portal'} • Click to go home
              </p>
            </Link>
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

            {/* {hasPermission(accessContext, 'system:manage') && (
              <div className="pt-4 mt-4 border-t border-primary/10">
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-primary opacity-70">
                  Platform Admin
                </p>
                <Link
                  href="/admin/dashboard"
                  target="_blank"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-colors text-primary hover:bg-primary/10"
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span>Admin Dashboard</span>
                </Link>
              </div>
            )} */}
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
