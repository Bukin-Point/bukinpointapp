import {
  type PaymentGatewayClient,
  type InitializePaymentParams,
  type InitializePaymentResult,
  type PaymentVerificationResult,
  type WebhookParseResult,
} from './gateway'
import { createOPayCashierPayment, verifyOPayCallback } from '@/lib/opay'

export class OPayGateway implements PaymentGatewayClient {
  readonly name = 'OPAY'

  async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResult | { error: string }> {
    const result = await createOPayCashierPayment({
      reference: params.reference,
      amountTotalKobo: params.amountKobo,
      product: { name: params.productName, description: params.productDescription },
      returnUrl: params.returnUrl,
      callbackUrl: params.callbackUrl,
      cancelUrl: params.cancelUrl,
      userInfo: {
        userName: params.customerName,
        userMobile: params.customerPhone,
        userEmail: params.customerEmail,
      },
      expireAt: 30,
    })

    if ('error' in result) return { error: result.error }
    return { redirectUrl: result.cashierUrl, reference: params.reference }
  }

  async verifyPayment(_reference: string): Promise<PaymentVerificationResult> {
    // OPay does not expose a simple server-side verify-by-reference API in the same way as Paystack.
    // Verification is done via webhook. Return pending; webhook will have already updated state.
    return { success: false, reference: _reference }
  }

  handleWebhook(rawBody: string, _signature: string | null): WebhookParseResult {
    let body: unknown
    try {
      body = JSON.parse(rawBody) as unknown
    } catch {
      return { valid: false }
    }
    const { payload, valid } = verifyOPayCallback(body)
    if (!valid || !payload) return { valid: false }
    return {
      valid: true,
      reference: payload.reference ?? undefined,
      success: payload.status === 'SUCCESS',
      transactionId: payload.transactionId ?? undefined,
      refunded: payload.refunded === true,
    }
  }
}
