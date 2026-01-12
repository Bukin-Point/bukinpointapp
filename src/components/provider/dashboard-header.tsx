'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Bell, Menu, X, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AccessContext, isStaff } from '@/lib/staff-helpers-client'
import { ProviderSelector } from './provider-selector'
import { useClerk } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardHeaderProps {
  businessName: string
  accessContext: AccessContext
  userId: string
  onMenuToggle?: () => void
  mobileMenuOpen?: boolean
}

export function DashboardHeader({
  businessName,
  accessContext,
  userId,
  onMenuToggle,
  mobileMenuOpen,
}: DashboardHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useClerk()
  const userIsStaff = isStaff(accessContext)
  const industry = accessContext.provider.industry

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase()
    }
    if (user?.emailAddresses[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress[0].toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left Section - Mobile Menu */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Industry Badge */}
          {industry && (
            <Badge variant="outline" className="hidden sm:flex">
              {industry}
            </Badge>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-3">
          {/* Provider Selector - Desktop */}
          <div className="hidden md:block">
            <ProviderSelector userId={userId} />
          </div>

          {/* Notifications - Future feature */}
          <Button variant="ghost" size="icon" className="hidden sm:flex" disabled>
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg p-1">
                <Avatar
                  src={user?.imageUrl}
                  alt={user?.firstName || 'User'}
                  fallback={getUserInitials()}
                  className="h-9 w-9"
                />
                <div className="hidden sm:flex flex-col items-start min-w-0">
                  <span className="text-body-sm font-medium truncate max-w-[120px]">
                    {user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'}
                  </span>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    {userIsStaff ? 'Staff' : 'Provider'}
                  </Badge>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => router.push('/profile')}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut()
                  router.push('/')
                }}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
