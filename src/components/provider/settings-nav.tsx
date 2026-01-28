'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

const settingsNavItems = [
  { href: '/settings/business', label: 'Business Details', icon: Building2 },
  // Future settings pages can be added here:
  // { href: '/settings/profile', label: 'Profile', icon: User },
  // { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  // { href: '/settings/security', label: 'Security', icon: Shield },
  // { href: '/settings/billing', label: 'Billing', icon: CreditCard },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <Card className="p-2">
      <nav className="space-y-1">
        {settingsNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </Card>
  )
}
