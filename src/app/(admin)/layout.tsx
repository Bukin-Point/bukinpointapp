import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { hasPermission } from '@/lib/auth-helpers-clerk'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session) {
        redirect('/signin')
    }

    // PLATFORM SECURITY: Ensure user has platform-wide manage permission
    // We use the system provider context for this check
    const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')

    if (!canManageSystem) {
        console.warn(`[Security] Unauthorized admin access attempt by user ${session.user.id}`)
        redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-surface">
            <AdminNav />
            <main className="lg:pl-64">
                <div className="px-4 py-8 sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
