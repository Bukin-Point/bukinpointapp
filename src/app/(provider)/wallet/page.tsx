import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canManageStaff, canViewWallet } from '@/lib/staff-helpers'
import { prisma } from '@/lib/db'
import { WalletView } from '@/components/provider/wallet-view'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'
import { resolveRequestTenant } from '@/lib/request-tenant'

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ providerId?: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  // SECURITY: If on a subdomain, use the subdomain's provider ID (enforced by layout)
  const tenant = await resolveRequestTenant()

  const params = await searchParams
  // Prioritize subdomain provider ID over URL parameter for security
  const urlProviderId = tenant.providerId || (params.providerId ? sanitizeProviderId(params.providerId) : undefined)

  // Get provider access (either as provider or staff)
  const accessContext = await getProviderAccess(session.user.id, urlProviderId || undefined)

  if (!accessContext) {
    if (urlProviderId) {
      return (
        <ProviderContextError
          userId={session.user.id}
          errorMessage="You don't have access to this provider or the provider doesn't exist."
        />
      )
    }
    redirect('/onboarding')
  }

  // Only providers and users with wallet:read permission can access wallet
  if (!canViewWallet(accessContext)) {
    redirect('/dashboard')
  }

  const provider = await prisma.provider.findUnique({
    where: { id: accessContext.provider.id },
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
    pendingBalance: Number(provider.wallet.pendingBalance),
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
