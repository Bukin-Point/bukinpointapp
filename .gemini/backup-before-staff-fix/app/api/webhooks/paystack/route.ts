import { NextResponse } from 'next/server'
import { PaystackGateway } from '@/lib/payments/paystack-gateway'
import { fulfillPaymentSuccess } from '@/lib/payments/fulfill-payment'
import { PaymentGateway } from '@prisma/client'

const paystackGateway = new PaystackGateway()

export async function POST(request: Request) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const signature = request.headers.get('x-paystack-signature') ?? null
  const result = paystackGateway.handleWebhook(rawBody, signature)

  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!result.success || !result.reference) {
    return NextResponse.json({ ok: true })
  }

  await fulfillPaymentSuccess({
    reference: result.reference,
    transactionId: result.transactionId,
    gatewayName: PaymentGateway.PAYSTACK,
  })

  return NextResponse.json({ ok: true })
}
