# Customer Accounts

## Overview

Customers can create accounts to track bookings, view history, and have faster checkout. Guest bookings can be linked to customer accounts when they sign up with the same email.

## User Stories

- As a **customer**, I want to create an account so that I can track my bookings
- As a **customer**, I want to see my booking history so that I can reference past appointments
- As a **customer**, I want my guest bookings linked when I sign up so that I don't lose history

## Implementation Details

### Server Actions
- **File**: `src/actions/customer.ts`
- **Functions**:
  - `linkBookingsToAccount()` - Link guest bookings to customer account

### Database Models
- **User** - Customer accounts
- **Booking** - Bookings (with optional `userId`)

### Key Components
- `src/components/auth/customer-signup-form.tsx` - Customer signup
- `src/components/customer/customer-nav.tsx` - Customer navigation
- `src/app/(customer)/customer/dashboard/page.tsx` - Customer dashboard

## User Interface

### Routes
- `/signup/customer` - Customer signup
- `/customer/dashboard` - Customer dashboard
- `/customer/bookings` - Booking history
- `/customer/profile` - Customer profile

### Customer Signup
- **Fields**: Name, Email, Password, Confirm Password
- **Process**:
  1. Creates user account
  2. Links existing guest bookings with matching email
  3. Redirects to customer dashboard

### Customer Dashboard
- **Displays**:
  - Booking statistics
  - Upcoming bookings
  - Past bookings
  - Quick actions

## Guest Booking Linking

### Process
1. Customer signs up with email
2. System searches for bookings with matching email
3. Links bookings to customer account (`userId` field)
4. Bookings appear in customer dashboard

### Matching Criteria
- Email must match exactly
- Booking must not already have `userId`
- Booking can be any status

## Edge Cases

### No Matching Bookings
- **Behavior**: Account created normally
- **Display**: Empty booking history

### Multiple Guest Bookings
- **Behavior**: All matching bookings linked
- **Display**: All appear in booking history

## Related Features

- [Authentication](./authentication.md) - Customer signup
- [Bookings](./bookings.md) - Guest booking creation

## Changelog

- **2025-01-10** - Initial customer accounts documentation
