/**
 * Payment gateway abstraction: one interface for OPay, Paystack, etc.
 * Booking/payment flows use this instead of provider-specific code.
 */

export interface InitializePaymentParams {
  bookingId: string
  reference: string
  amountKobo: number
  currency: string
  customerEmail: string
  customerName: string
  customerPhone?: string
  callbackUrl: string
  returnUrl: string
  cancelUrl: string
  productName: string
  productDescription: string
}

export interface InitializePaymentResult {
  redirectUrl: string
  reference: string
}

export interface PaymentVerificationResult {
  success: boolean
  reference: string
  transactionId?: string
  amountKobo?: number
  currency?: string
}

export interface WebhookParseResult {
  valid: boolean
  reference?: string
  success?: boolean
  transactionId?: string
  refunded?: boolean
}

export interface PaymentGatewayClient {
  readonly name: string

  /**
   * Initialize a payment and return the URL to redirect the customer to.
   */
  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult | { error: string }>

  /**
   * Verify a payment by reference (e.g. after redirect or for idempotency).
   */
  verifyPayment(reference: string): Promise<PaymentVerificationResult>

  /**
   * Parse and verify webhook payload and signature; returns normalized result for DB updates.
   */
  handleWebhook(rawBody: string, signature: string | null): WebhookParseResult
}
