import { describe, it, expect } from 'vitest'
import { OPayGateway } from '@/lib/payments/opay-gateway'
import { PaystackGateway } from '@/lib/payments/paystack-gateway'
import type { PaymentGatewayClient } from '@/lib/payments/gateway'

describe('Payment gateway interface', () => {
  it('OPayGateway implements PaymentGatewayClient', () => {
    const gateway: PaymentGatewayClient = new OPayGateway()
    expect(gateway.name).toBe('OPAY')
    expect(typeof gateway.initializePayment).toBe('function')
    expect(typeof gateway.verifyPayment).toBe('function')
    expect(typeof gateway.handleWebhook).toBe('function')
  })

  it('PaystackGateway implements PaymentGatewayClient', () => {
    const gateway: PaymentGatewayClient = new PaystackGateway()
    expect(gateway.name).toBe('PAYSTACK')
    expect(typeof gateway.initializePayment).toBe('function')
    expect(typeof gateway.verifyPayment).toBe('function')
    expect(typeof gateway.handleWebhook).toBe('function')
  })
})

describe('OPayGateway handleWebhook', () => {
  it('returns valid: false for invalid JSON', () => {
    const gateway = new OPayGateway()
    const result = gateway.handleWebhook('not json', null)
    expect(result.valid).toBe(false)
  })

  it('returns valid: false when signature verification fails', () => {
    const gateway = new OPayGateway()
    const body = JSON.stringify({
      payload: { reference: 'ref1', status: 'SUCCESS' },
      sha512: 'wrong',
    })
    const result = gateway.handleWebhook(body, 'wrong')
    expect(result.valid).toBe(false)
  })
})

describe('PaystackGateway handleWebhook', () => {
  it('returns valid: false when signature is missing', () => {
    const gateway = new PaystackGateway()
    const result = gateway.handleWebhook('{}', null)
    expect(result.valid).toBe(false)
  })

  it('returns valid: false when signature does not match', () => {
    const gateway = new PaystackGateway()
    const result = gateway.handleWebhook('{"event":"charge.success","data":{}}', 'invalid-signature')
    expect(result.valid).toBe(false)
  })
})
