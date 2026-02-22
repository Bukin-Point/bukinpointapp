import { getGlobalPaymentGateway } from '@/lib/payment-config'
import { GlobalGatewayForm } from '@/components/admin/global-gateway-form'
import { Settings, ShieldAlert } from 'lucide-react'

export default async function AdminSettingsPage() {
    const currentGateway = await getGlobalPaymentGateway()

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Platform Configuration</h1>
                <p className="text-text-secondary">
                    Global settings and administrative controls for the BukinPoint platform.
                </p>
            </div>

            <div className="grid gap-8">
                {/* Payment Configuration */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <Settings className="h-5 w-5 text-primary" />
                        <h2>Payment Infrastructure</h2>
                    </div>
                    <GlobalGatewayForm currentDefault={currentGateway} />
                </section>

                {/* Placeholder for future Platform-wide settings */}
                <div className="rounded-xl border-2 border-dashed border-accent p-12 text-center">
                    <ShieldAlert className="mx-auto h-12 w-12 text-accent mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">Future Platform Controls</h3>
                    <p className="max-w-md mx-auto text-text-secondary mt-2">
                        Additional platform-wide settings like platform fee percentages,
                        global service categories, and maintenance mode controls will appear here.
                    </p>
                </div>
            </div>
        </div>
    )
}
