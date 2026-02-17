'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { AccessContext, hasPermission } from '@/lib/staff-helpers-client'

const settingsNavItems = [
  { href: '/settings/business', label: 'Business Details', icon: Building2, permission: 'manage:settings' },
  { href: '/settings/payments', label: 'Payments', icon: CreditCard, permission: 'manage:settings' },
]

export function SettingsNav({ accessContext }: { accessContext: AccessContext }) {
  const pathname = usePathname()

  // Filter based on permissions
  const filteredItems = settingsNavItems.filter(item =>
    hasPermission(accessContext, item.permission)
  )

  if (filteredItems.length === 0) return null

  return (
    <Card className="p-2">
      <nav className="space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-colors ${isActive
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
