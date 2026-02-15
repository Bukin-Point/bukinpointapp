import { NextResponse } from 'next/server'
import { OPayGateway } from '@/lib/payments/opay-gateway'
import { fulfillPaymentSuccess } from '@/lib/payments/fulfill-payment'
import { PaymentGateway } from '@prisma/client'

const opayGateway = new OPayGateway()

export async function POST(request: Request) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  let body: { payload?: unknown; sha512?: string }
  try {
    body = JSON.parse(rawBody) as { payload?: unknown; sha512?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = opayGateway.handleWebhook(rawBody, body.sha512 ?? null)
  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!result.success || result.refunded || !result.reference) {
    return NextResponse.json({ ok: true })
  }

  await fulfillPaymentSuccess({
    reference: result.reference,
    transactionId: result.transactionId,
    gatewayName: PaymentGateway.OPAY,
  })

  return NextResponse.json({ ok: true })
}
