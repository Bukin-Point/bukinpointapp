'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth-helpers-clerk'
import { getProviderAccess, canManageStaff } from '@/lib/staff-helpers'
import {
  setProviderPaymentGateway as setProviderGatewayInDb,
  setGlobalPaymentGateway as setGlobalGatewayInDb,
} from '@/lib/payment-config'
import { PaymentGateway } from '@prisma/client'
import { isUserSuperAdmin, hasPermission } from '@/lib/auth-helpers-clerk'

/**
 * Update the payment gateway override for a provider. Caller must have access to the provider (owner or manage staff).
 */
export async function updateProviderPaymentGatewayAction(
  providerId: string,
  gateway: PaymentGateway | null
): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized' }

  if (!(await hasPermission(providerId, 'manage:settings'))) {
    return { error: 'You do not have permission to change this setting.' }
  }

  await setProviderGatewayInDb(providerId, gateway)
  revalidatePath('/settings/payments')
  revalidatePath('/settings')
  return {}
}

/**
 * Update the global default payment gateway. Caller must be a super admin.
 */
export async function updateGlobalPaymentGatewayAction(
  gateway: PaymentGateway
): Promise<{ error?: string }> {
  const session = await getSession()
  const isSuperAdmin = await isUserSuperAdmin()
  if (!session || !isSuperAdmin) return { error: 'Unauthorized' }

  await setGlobalGatewayInDb(gateway)
  revalidatePath('/settings/payments')
  revalidatePath('/settings')
  return {}
}
