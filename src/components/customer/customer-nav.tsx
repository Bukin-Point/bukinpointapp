'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, User, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/customer/dashboard', label: 'Dashboard', icon: Home },
  { href: '/customer/bookings', label: 'My Bookings', icon: Calendar },
  { href: '/customer/profile', label: 'Profile', icon: User },
]

export function CustomerNav({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/signin')
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-card p-4 lg:hidden">
        <Link
          href="/"
          className="group flex-1 min-w-0 mr-2"
          onClick={() => setMobileMenuOpen(false)}
        >
          <h2 className="text-h4 font-semibold truncate group-hover:text-primary group-hover:underline transition-all cursor-pointer">
            {userName}
          </h2>
          <p className="text-xs text-text-secondary group-hover:text-primary/70 transition-colors truncate">
            Click to go home
          </p>
        </Link>
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
          onClick={() => setMobileMenuOpen(false)}
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
          <div className="hidden md:inline border-b p-6 pt-20 lg:pt-6">
            <Link href="/" className="block group" onClick={() => setMobileMenuOpen(false)}>
              <h2 className="text-h4 font-semibold group-hover:text-primary group-hover:underline transition-all cursor-pointer">
                {userName}
              </h2>
              <p className="text-caption text-text-secondary group-hover:text-primary/70 transition-colors">
                Customer Portal • Click to go home
              </p>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="mt-[5em] md:mt-0 flex-1 space-y-1 overflow-y-auto p-4">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
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
