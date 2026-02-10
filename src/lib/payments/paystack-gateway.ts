import { createHmac } from 'crypto'
import {
  type PaymentGatewayClient,
  type InitializePaymentParams,
  type InitializePaymentResult,
  type PaymentVerificationResult,
  type WebhookParseResult,
} from './gateway'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'

export class PaystackGateway implements PaymentGatewayClient {
  readonly name = 'PAYSTACK'

  async initializePayment(
    params: InitializePaymentParams
  ): Promise<InitializePaymentResult | { error: string }> {
    if (!PAYSTACK_SECRET_KEY) {
      return { error: 'Paystack is not configured. Set PAYSTACK_SECRET_KEY.' }
    }

    const body = {
      email: params.customerEmail,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: {
        bookingId: params.bookingId,
        customerName: params.customerName,
      },
    }

    const res = await fetch(`${PAYSTACK_BASE_URL.replace(/\/$/, '')}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify(body),
    })

    const json = (await res.json()) as {
      status?: boolean
      message?: string
      data?: { authorization_url?: string; reference?: string }
    }

    if (!json.status || !json.data?.authorization_url) {
      return { error: json.message || 'Paystack failed to initialize transaction' }
    }

    return {
      redirectUrl: json.data.authorization_url,
      reference: json.data.reference ?? params.reference,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    if (!PAYSTACK_SECRET_KEY) {
      return { success: false, reference }
    }

    const res = await fetch(
      `${PAYSTACK_BASE_URL.replace(/\/$/, '')}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    )

    const json = (await res.json()) as {
      status?: boolean
      data?: {
        reference?: string
        status?: string
        amount?: number
        currency?: string
        id?: number
      }
    }

    const data = json.data
    const success = json.status === true && data?.status === 'success'

    return {
      success,
      reference: data?.reference ?? reference,
      transactionId: data?.id?.toString(),
      amountKobo: data?.amount,
      currency: data?.currency,
    }
  }

  handleWebhook(rawBody: string, signature: string | null): WebhookParseResult {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET_KEY
    if (!secret || !signature) return { valid: false }

    const hash = createHmac('sha512', secret).update(rawBody).digest('hex')
    if (hash !== signature) return { valid: false }

    let event: { event?: string; data?: { reference?: string; status?: string } }
    try {
      event = JSON.parse(rawBody) as typeof event
    } catch {
      return { valid: false }
    }

    if (event.event !== 'charge.success') {
      return { valid: true, success: false, reference: event.data?.reference }
    }

    return {
      valid: true,
      success: event.data?.status === 'success',
      reference: event.data?.reference,
      transactionId: event.data?.reference,
    }
  }
}
