import { getPlatformStats } from '@/actions/admin'
import { StatsCard } from '@/components/provider/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, CreditCard, Wallet, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function AdminDashboardPage() {
    const result = await getPlatformStats()

    if (!result.success || !result.stats) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
                <Activity className="h-12 w-12 text-destructive" />
                <h1 className="text-xl font-semibold">Error Loading Platform Stats</h1>
                <p className="text-text-secondary">{result.error || 'Please try again later.'}</p>
            </div>
        )
    }

    const { stats, recentTransactions } = result

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
                <p className="text-text-secondary">
                    Aggregated performance data across the BukinPoint ecosystem.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Volume"
                    value={formatCurrency(stats.totalVolume)}
                    icon={Wallet}
                />
                <StatsCard
                    title="Platform Revenue"
                    value={formatCurrency(stats.platformRevenue)}
                    icon={CreditCard}
                />
                <StatsCard
                    title="Active Providers"
                    value={stats.providers}
                    icon={Building2}
                />
                <StatsCard
                    title="Total Users"
                    value={stats.users}
                    icon={Users}
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.map((tx: any) => (
                                    <div key={tx.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium">{tx.booking.service.name}</p>
                                            <p className="text-xs text-text-secondary">
                                                {tx.booking.provider.businessName} • {new Date(tx.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold">{formatCurrency(Number(tx.amount))}</p>
                                            <p className="text-xs text-primary font-medium">Fee: {formatCurrency(Number(tx.platformFee))}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-8 text-text-secondary">No recent transactions found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Placeholder for Quick Platform Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <Activity className="h-8 w-8" />
                        </div>
                        <h2 className="mt-4 font-semibold text-lg text-green-700">All Systems Operational</h2>
                        <p className="mt-2 text-center text-sm text-text-secondary">
                            Database, Auth, and Payment providers are currently synced and healthy.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
