import { getCurrentGatewayForProvider } from '@/lib/payment-config'
import { PaymentGateway } from '@prisma/client'
import { OPayGateway } from './opay-gateway'
import { PaystackGateway } from './paystack-gateway'
import type { PaymentGatewayClient } from './gateway'

const opay = new OPayGateway()
const paystack = new PaystackGateway()

function gatewayFromEnum(gateway: PaymentGateway): PaymentGatewayClient {
  switch (gateway) {
    case 'PAYSTACK':
      return paystack
    case 'OPAY':
    default:
      return opay
  }
}

/**
 * Get the payment gateway client for the given provider (or global default if no provider).
 * Use this in server actions and API routes when initiating or verifying payments.
 */
export async function getPaymentGateway(providerId: string | undefined): Promise<PaymentGatewayClient> {
  const gateway = await getCurrentGatewayForProvider(providerId)
  return gatewayFromEnum(gateway)
}
