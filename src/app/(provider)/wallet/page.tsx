import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { WalletView } from '@/components/provider/wallet-view'

export default async function WalletPage() {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const provider = await prisma.provider.findUnique({
    where: { userId: session.user.id },
    include: {
      wallet: true,
    },
  })

  if (!provider) {
    redirect('/onboarding')
  }

  if (!provider.wallet) {
    redirect('/onboarding')
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      booking: {
        providerId: provider.id,
      },
    },
    include: {
      booking: {
        include: {
          service: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Convert Decimal fields to numbers for client component
  const serializedWallet = {
    ...provider.wallet,
    balance: Number(provider.wallet.balance),
    totalEarnings: Number(provider.wallet.totalEarnings),
  }

  const serializedTransactions = transactions.map((transaction) => ({
    ...transaction,
    amount: Number(transaction.amount),
    platformFee: Number(transaction.platformFee),
    netAmount: Number(transaction.netAmount),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-h1 mb-2">Wallet</h1>
        <p className="text-body-sm text-text-secondary">
          View your earnings and transaction history
        </p>
      </div>
      <WalletView wallet={serializedWallet} transactions={serializedTransactions} />
    </div>
  )
}
