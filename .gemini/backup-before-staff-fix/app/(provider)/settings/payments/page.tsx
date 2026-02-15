import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers-clerk'
import { headers } from 'next/headers'
import { getProviderAccess, canManageStaff } from '@/lib/staff-helpers'
import {
  getCurrentGatewayForProvider,
  getGlobalPaymentGateway,
  getProviderPaymentGatewayOverride,
} from '@/lib/payment-config'
import { sanitizeProviderId } from '@/lib/auth-utils'
import { ProviderContextError } from '@/components/provider/provider-context-error'
import { PaymentGatewayForm } from '@/components/provider/payment-gateway-form'
import { isUserSuperAdmin } from '@/lib/auth-helpers-clerk'

export default async function PaymentsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ providerId?: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/signin')
  }

  const headersList = await headers()
  const subdomainProviderId = headersList.get('x-provider-id')
  const params = await searchParams
  const urlProviderId =
    subdomainProviderId || (params.providerId ? sanitizeProviderId(params.providerId) : undefined)

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

  if (!canManageStaff(accessContext)) {
    redirect('/dashboard')
  }

  const providerId = accessContext.provider.id
  const [effectiveGateway, globalDefault, providerOverride] = await Promise.all([
    getCurrentGatewayForProvider(providerId),
    getGlobalPaymentGateway(),
    getProviderPaymentGatewayOverride(providerId),
  ])

  const isAdmin = await isUserSuperAdmin(session.user.email)

  return (
    <div className="space-y-6">
      <PaymentGatewayForm
        providerId={providerId}
        effectiveGateway={effectiveGateway}
        globalDefault={globalDefault}
        providerOverride={providerOverride}
        isAdmin={isAdmin}
      />
    </div>
  )
}
