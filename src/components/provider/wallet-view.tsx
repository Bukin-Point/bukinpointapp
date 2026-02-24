'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

type SerializedWallet = {
  id: string
  providerId: string | null
  userId: string | null
  balance: number
  pendingBalance: number
  totalEarnings: number
  lastSettlement: Date | null
  createdAt: Date
  updatedAt: Date
}

type SerializedTransaction = {
  id: string
  bookingId: string
  amount: number
  platformFee: number
  netAmount: number
  paymentProvider: string
  providerRef: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  booking: {
    service: {
      name: string
    }
  }
}

interface WalletViewProps {
  wallet: SerializedWallet
  transactions: SerializedTransaction[]
}

export function WalletView({ wallet, transactions }: WalletViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-h4">Current Balance</CardTitle>
            <CardDescription>Available for withdrawal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₦{wallet.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h4">Pending Balance</CardTitle>
            <CardDescription>Escrow funds (Awaiting Code)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₦{wallet.pendingBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h4">Total Earnings</CardTitle>
            <CardDescription>All-time earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ₦{wallet.totalEarnings.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h4">Last Settlement</CardTitle>
            <CardDescription>Most recent withdrawal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body">
              {wallet.lastSettlement
                ? format(new Date(wallet.lastSettlement), 'MMM d, yyyy')
                : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-body-sm text-text-secondary">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="font-medium">{transaction.booking.service.name}</p>
                    <p className="text-caption text-text-secondary">
                      {format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ₦{transaction.netAmount.toLocaleString()}
                    </p>
                    <Badge
                      variant={
                        transaction.status === 'PAID' ? 'default' : 'secondary'
                      }
                      className="mt-1"
                    >
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
