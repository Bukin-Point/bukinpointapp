# Payments

## Overview

Payment processing for completed bookings. Transactions are created with platform fees, and provider wallets are updated with earnings.

## User Stories

- As a **provider**, I want payments processed so that I receive earnings
- As a **provider**, I want to see transaction history so that I can track payments
- As a **system**, I want to calculate platform fees so that revenue is shared

## Implementation Details

### Server Actions
- **File**: `src/actions/payments.ts`
- **Functions**:
  - `processPayment()` - Process payment for booking
  - `getTransactions()` - Get transaction history

### Database Models
- **Transaction** - Payment transactions
- **Wallet** - Provider wallets
- **Booking** - Bookings with payment status

### Payment Flow
1. Booking marked as COMPLETED
2. Payment processed (simulated in MVP)
3. Transaction created with:
   - Amount (service price)
   - Platform fee (configurable percentage)
   - Net amount (amount - platform fee)
4. Wallet updated:
   - Balance increased by net amount
   - Total earnings increased

## Edge Cases

### Payment Failure
- **Status**: Payment status set to FAILED
- **Behavior**: Wallet not updated
- **Recovery**: Retry payment processing

### Platform Fee Calculation
- **Default**: 10% (configurable via `PLATFORM_FEE_PERCENTAGE`)
- **Formula**: `netAmount = amount - (amount * platformFeePercentage / 100)`

## Related Features

- [Wallet](./wallet.md) - Wallet updates
- [Bookings](./bookings.md) - Payment triggers

## Changelog

- **2025-01-10** - Initial payments documentation
