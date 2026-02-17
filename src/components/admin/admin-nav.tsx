'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    Building2,
    Users,
    CreditCard,
    Settings,
    LogOut,
    ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const adminNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/admin/providers', label: 'Providers', icon: Building2 },
    { href: '/admin/customers', label: 'Customers', icon: Users },
    { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
    { href: '/admin/settings', label: 'Global Settings', icon: Settings },
]

export function AdminNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { signOut } = useClerk()

    const handleSignOut = async () => {
        await signOut()
        router.push('/signin')
    }

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card lg:block">
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="border-b p-6">
                    <Link href="/admin/dashboard" className="flex items-center gap-2 group">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                                BukinPoint
                            </h2>
                            <p className="text-[10px] font-medium text-text-secondary">
                                PLATFORM ADMIN
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                    {adminNavItems.map(item => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-text-secondary hover:bg-accent hover:text-accent-foreground'
                                )}
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
    )
}
