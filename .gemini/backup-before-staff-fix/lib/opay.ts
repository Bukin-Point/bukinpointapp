import { hmac } from '@noble/hashes/hmac.js'
import { sha3_512 } from '@noble/hashes/sha3.js'
import { bytesToHex } from '@noble/hashes/utils.js'

const OPAY_BASE_URL = process.env.OPAY_BASE_URL || 'https://testapi.opaycheckout.com'
const OPAY_MERCHANT_ID = process.env.OPAY_MERCHANT_ID || ''
const OPAY_PUBLIC_KEY = process.env.OPAY_PUBLIC_KEY || ''
const OPAY_PRIVATE_KEY = process.env.OPAY_PRIVATE_KEY || ''

export interface CreateOPayCashierParams {
  reference: string
  amountTotalKobo: number
  product: { name: string; description: string }
  returnUrl: string
  callbackUrl: string
  cancelUrl: string
  userInfo: { userName: string; userMobile?: string; userEmail?: string }
  expireAt?: number
}

/**
 * Create payment via OPay Cashier (POST /api/v1/international/cashier/create).
 * Returns cashierUrl to redirect the customer to OPay's secured checkout page.
 * Auth: Bearer {OPAY_PUBLIC_KEY}.
 */
export async function createOPayCashierPayment(
  params: CreateOPayCashierParams
): Promise<{ cashierUrl: string } | { error: string }> {
  if (!OPAY_PUBLIC_KEY || !OPAY_MERCHANT_ID) {
    return { error: 'OPay is not configured. Set OPAY_PUBLIC_KEY and OPAY_MERCHANT_ID.' }
  }

  const body = {
    country: 'NG',
    reference: params.reference,
    amount: { total: params.amountTotalKobo, currency: 'NGN' },
    returnUrl: params.returnUrl,
    callbackUrl: params.callbackUrl,
    cancelUrl: params.cancelUrl,
    product: params.product,
    userInfo: params.userInfo,
    expireAt: params.expireAt ?? 30,
  }

  const url = `${OPAY_BASE_URL.replace(/\/$/, '')}/api/v1/international/cashier/create`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPAY_PUBLIC_KEY}`,
      MerchantId: OPAY_MERCHANT_ID,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as { code?: string; message?: string; data?: { cashierUrl?: string } }

  if (json.code !== '00000') {
    return { error: json.message || `OPay error: ${json.code || res.status}` }
  }

  const cashierUrl = json.data?.cashierUrl
  if (!cashierUrl) return { error: 'OPay returned no cashierUrl.' }

  return { cashierUrl }
}

/** OPay callback body shape. */
export interface OPayCallbackBody {
  payload?: {
    amount?: string
    currency?: string
    reference?: string
    refunded?: boolean
    status?: string
    timestamp?: string
    token?: string
    transactionId?: string
  }
  sha512?: string
  type?: string
}

/**
 * Verify OPay callback signature (HMAC-SHA3-512 of payload string).
 * Signed string: {Amount:"...",Currency:"...",Reference:"...",Refunded:t|f,Status:"...",Timestamp:"...",Token:"...",TransactionID:"..."}
 */
export function verifyOPayCallback(body: unknown): { payload: OPayCallbackBody['payload']; valid: boolean } {
  const b = body as OPayCallbackBody
  const payload = b?.payload
  const sha = b?.sha512

  if (!payload || !sha || typeof payload !== 'object') {
    return { payload: undefined, valid: false }
  }

  const amount = String(payload.amount ?? '')
  const currency = String(payload.currency ?? '')
  const ref = String(payload.reference ?? '')
  const refunded = payload.refunded === true ? 't' : 'f'
  const status = String(payload.status ?? '')
  const timestamp = String(payload.timestamp ?? '')
  const token = String(payload.token ?? '')
  const txnId = String(payload.transactionId ?? '')

  const signed = `{Amount:"${amount}",Currency:"${currency}",Reference:"${ref}",Refunded:${refunded},Status:"${status}",Timestamp:"${timestamp}",Token:"${token}",TransactionID:"${txnId}"}`

  const key = OPAY_PRIVATE_KEY
  if (!key) return { payload, valid: false }

  const mac = hmac(sha3_512, Buffer.from(key, 'utf8'), Buffer.from(signed, 'utf8'))
  const hex = bytesToHex(mac)
  const valid = hex.toLowerCase() === String(sha).toLowerCase()

  return { payload, valid }
}
