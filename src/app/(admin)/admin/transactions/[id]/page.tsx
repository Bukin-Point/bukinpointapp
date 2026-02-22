import { getTransactionDetails } from '@/actions/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    CreditCard,
    ArrowLeft,
    Building2,
    Briefcase,
    User,
    Calendar,
    ShieldCheck,
    ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'

export default async function TransactionDetailsPage({ params }: { params: { id: string } }) {
    const result = await getTransactionDetails(params.id)

    if (!result.success || !result.transaction) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-text-secondary">Error: {result.error || 'Transaction not found'}</p>
                <Link href="/admin/transactions" className="mt-4 flex items-center gap-1 text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Ledger
                </Link>
            </div>
        )
    }

    const transaction = result.transaction as any

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/transactions" className="rounded-full border p-2 hover:bg-accent transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transaction Detail</h1>
                    <p className="text-text-secondary">Reference: {transaction.providerRef || transaction.id}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Payment Breakdown */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Financial Breakdown</CardTitle>
                        <CardDescription>Detailed audit of the processed payment and platform deductions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex flex-col items-center justify-center space-y-2 rounded-2xl bg-accent/50 py-12">
                            <span className="text-sm font-medium uppercase tracking-wider text-text-secondary">Total Amount Paid</span>
                            <h2 className="text-5xl font-extrabold">{formatCurrency(Number(transaction.amount))}</h2>
                            <Badge variant="outline" className="mt-2 bg-green-100 text-green-700 px-4">
                                {transaction.status}
                            </Badge>
                        </div>

                        <div className="grid gap-8 border-t pt-8 sm:grid-cols-2">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-text-secondary">Platform Processing Fee</span>
                                    <span className="font-semibold text-destructive">-{formatCurrency(Number(transaction.platformFee))}</span>
                                </div>
                                <div className="flex items-center justify-between border-t pt-2 text-lg">
                                    <span className="font-medium">Provider Net Payout</span>
                                    <span className="font-bold text-primary">{formatCurrency(Number(transaction.netAmount))}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">Payment Method</span>
                                    <span className="font-medium flex items-center gap-1">
                                        <CreditCard className="h-3 w-3" />
                                        {transaction.paymentProvider}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">Gateway Ref</span>
                                    <span className="font-mono text-xs">{transaction.providerRef || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-secondary">Processed At</span>
                                    <span className="font-medium">{new Date(transaction.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Associated Context */}
                <Card>
                    <CardHeader>
                        <CardTitle>Booking Context</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Link href={`/admin/providers/${transaction.booking.providerId}`} className="group flex flex-col gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                                    Provider <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                                <div className="flex items-center gap-2 rounded-lg border p-3 group-hover:bg-accent transition-colors">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">{transaction.booking.provider.businessName}</span>
                                </div>
                            </Link>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Service</span>
                                <div className="flex items-center gap-2 rounded-lg border p-3">
                                    <Briefcase className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">{transaction.booking.service.name}</span>
                                </div>
                            </div>

                            <Link href={`/admin/customers/${transaction.booking.userId}`} className="group flex flex-col gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center justify-between">
                                    Customer <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                                <div className="flex items-center gap-2 rounded-lg border p-3 group-hover:bg-accent transition-colors">
                                    <User className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-sm font-medium">{transaction.booking.user.name || 'Anonymous'}</p>
                                        <p className="text-[10px] text-text-secondary">{transaction.booking.user.email}</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
