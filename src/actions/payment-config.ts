'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess, canManageStaff } from '@/lib/staff-helpers'
import {
  setProviderPaymentGateway as setProviderGatewayInDb,
} from '@/lib/payment-config'
import { PaymentGateway } from '@prisma/client'

/**
 * Update the payment gateway override for a provider. Caller must have access to the provider (owner or manage staff).
 */
export async function updateProviderPaymentGatewayAction(
  providerId: string,
  gateway: PaymentGateway | null
): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  const accessContext = await getProviderAccess(session.user.id, providerId)
  if (!accessContext || !canManageStaff(accessContext)) {
    return { error: 'You do not have permission to change this setting.' }
  }

  await setProviderGatewayInDb(providerId, gateway)
  revalidatePath('/settings/payments')
  revalidatePath('/settings')
  return {}
}
