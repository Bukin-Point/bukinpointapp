import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { hasPermission } from '@/lib/auth-helpers-clerk'
import { AdminNav } from '@/components/admin/admin-nav'
import { auth } from '@clerk/nextjs/server'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()
    const { sessionClaims } = await auth()

    if (!session) {
        redirect('/admin/signin')
    }

    // PLATFORM SECURITY: Ensure user has platform-wide manage permission
    const canManageSystem = await hasPermission('clsystemprovider000000', 'system:manage')

    // DEBUG LOGGING: Help the user understand their identity
    console.log(`[Admin] Identity Debug:`)
    console.log(` - User ID: ${session.user.id}`)
    console.log(` - User Email: ${session.user.email}`)
    console.log(` - System Manage Perm: ${canManageSystem}`)

    const perms = (sessionClaims?.metadata as any)?.permissions || {}
    console.log(` - All Permissions:`, JSON.stringify(perms, null, 2))

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
