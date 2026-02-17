import { getAllTransactions } from '@/actions/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ArrowRight, Building2, Briefcase } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default async function AdminTransactionsPage() {
    const result = await getAllTransactions()

    if (!result.success || !result.transactions) {
        return <div>Error loading transactions.</div>
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Platform Ledger</h1>
                <p className="text-text-secondary">
                    Master record of all platform-wide financial activity.
                </p>
            </div>

            <div className="rounded-xl border bg-background overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-accent/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Transaction ID</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Provider & Service</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Amount</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Platform Fee</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {result.transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-text-secondary">{tx.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1 font-medium">
                                                <Building2 className="h-3 w-3 text-text-secondary" />
                                                {tx.booking.provider.businessName}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-text-secondary">
                                                <Briefcase className="h-3 w-3" />
                                                {tx.booking.service.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold">
                                        {formatCurrency(Number(tx.amount))}
                                    </td>
                                    <td className="px-6 py-4 text-right text-primary font-medium">
                                        {formatCurrency(Number(tx.platformFee))}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge
                                            variant={tx.status === 'PAID' ? 'success' : 'secondary'}
                                            className={tx.status === 'PAID' ? 'bg-green-100 text-green-700' : ''}
                                        >
                                            {tx.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-text-secondary text-xs">
                                        {new Date(tx.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {result.transactions.length === 0 && (
                        <div className="py-20 text-center text-text-secondary">
                            <CreditCard className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p>No transactions found on the platform yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
