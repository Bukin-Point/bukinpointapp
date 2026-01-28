# Wallet

## Overview

Provider wallets track earnings from completed bookings. Wallets are automatically initialized during onboarding and updated when payments are processed.

## User Stories

- As a **provider**, I want to see my earnings so that I can track revenue
- As a **provider**, I want to see transaction history so that I can review payments
- As a **provider**, I want my wallet initialized automatically so that I can start earning

## Implementation Details

### Database Models
- **Wallet** - Provider wallet records
- **Transaction** - Payment transactions

### Wallet Initialization
- **Trigger**: Provider onboarding
- **Process**: Wallet created with balance 0
- **File**: `src/actions/provider.ts` (createProvider)

### Wallet Updates
- **Trigger**: Payment processing
- **Process**:
  1. Transaction created
  2. Wallet balance increased by net amount
  3. Total earnings increased by net amount

### Key Components
- `src/components/provider/wallet-view.tsx` - Wallet display
- `src/app/(provider)/wallet/page.tsx` - Wallet page

## User Interface

### Route
- `/wallet` - Wallet page (providers and OWNER role only)

### Wallet Display
- **Balance**: Current available balance
- **Total Earnings**: Lifetime earnings
- **Transaction History**: List of transactions with:
  - Date
  - Service name
  - Amount
  - Platform fee
  - Net amount
  - Status

## Permissions
- **Provider**: Full access
- **Staff (OWNER)**: Full access
- **Staff (STAFF)**: No access (route hidden)

## Edge Cases

### Decimal Serialization
- **Issue**: Prisma Decimal fields can't be serialized
- **Solution**: Convert to Number before passing to client components

## Related Features

- [Payments](./payments.md) - Payment processing
- [Provider Onboarding](./provider-onboarding.md) - Wallet initialization

## Changelog

- **2025-01-10** - Initial wallet documentation
