# Server Actions

## Overview

All server actions in BukinPoint, organized by feature area. Server actions are Next.js Server Actions that handle mutations and queries.

## Authentication Actions

Better Auth handles authentication via API routes. See `src/lib/auth.ts`.

## Provider Actions

**File**: `src/actions/provider.ts`

### `createProvider(data)`
Creates provider profile and initializes wallet.

**Input Schema**:
```typescript
{
  userId: string
  businessName: string
  industry: string
  address?: string
  phone: string
  email: string
  timezone: string
}
```

**Returns**: `{ success: boolean, provider?: Provider, error?: string }`

### `updateProvider(providerId, data)`
Updates provider business details.

**Input Schema**: Same as createProvider (all fields optional)

**Returns**: `{ success: boolean, provider?: Provider, error?: string }`

## Service Actions

**File**: `src/actions/services.ts`

### `createService(data)`
Creates new service.

**Input Schema**:
```typescript
{
  providerId: string
  name: string
  description?: string
  duration: number
  price: number
  isActive: boolean
}
```

**Returns**: `{ success: boolean, service?: Service, error?: string }`

### `updateService(serviceId, data)`
Updates existing service.

**Returns**: `{ success: boolean, service?: Service, error?: string }`

### `deleteService(serviceId)`
Deletes service.

**Returns**: `{ success: boolean, error?: string }`

## Staff Actions

**File**: `src/actions/staff.ts`

### `createStaff(data)`
Creates staff member (after invitation acceptance).

**Input Schema**:
```typescript
{
  providerId: string
  userId: string
  role: 'OWNER' | 'STAFF'
  serviceIds: string[]
}
```

**Returns**: `{ success: boolean, staff?: StaffMember, error?: string }`

## Staff Invitation Actions

**File**: `src/actions/staff-invitations.ts`

### `sendStaffInvitation(data)`
Creates and sends staff invitation email.

**Input Schema**:
```typescript
{
  providerId: string
  email: string
  role: 'OWNER' | 'STAFF'
  serviceIds: string[]
}
```

**Returns**: `{ success: boolean, invitation?: StaffInvitation, error?: string }`

### `getInvitationByToken(token)`
Validates invitation token.

**Returns**: `{ success: boolean, invitation?: StaffInvitation, error?: string }`

### `acceptInvitation(data)`
Accepts invitation and creates staff member.

**Input Schema**:
```typescript
{
  token: string
  name: string
  email: string
  password: string
}
```

**Returns**: `{ success: boolean, staff?: StaffMember, error?: string }`

## Booking Actions

**File**: `src/actions/bookings.ts`

### `createBooking(data)`
Creates new booking with slot locking.

**Input Schema**:
```typescript
{
  providerId: string
  serviceId: string
  staffId: string
  userId?: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  bookingDate: Date
  startTime: string
  endTime: string
  notes?: string
}
```

**Returns**: `{ success: boolean, booking?: Booking, error?: string }`

### `updateBookingStatus(bookingId, status)`
Updates booking status.

**Returns**: `{ success: boolean, booking?: Booking, error?: string }`

### `getAvailableSlots(providerId, date, serviceId)`
Gets available time slots for a date.

**Returns**: `{ success: boolean, slots?: string[], error?: string }`

## Availability Actions

**File**: `src/actions/availability.ts`

### `createAvailability(data)`
Creates availability slot.

**Input Schema**:
```typescript
{
  providerId: string
  staffId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isBlocked: boolean
}
```

**Returns**: `{ success: boolean, availability?: Availability, error?: string }`

## Payment Actions

**File**: `src/actions/payments.ts`

### `processPayment(bookingId)`
Processes payment for completed booking.

**Returns**: `{ success: boolean, transaction?: Transaction, error?: string }`

## Customer Actions

**File**: `src/actions/customer.ts`

### `linkBookingsToAccount(userId, email)`
Links guest bookings to customer account.

**Returns**: `{ success: boolean, linkedCount?: number, error?: string }`

## Dashboard Actions

**File**: `src/actions/dashboard.ts`

### `getDashboardStats(providerId, staffUserId?)`
Gets dashboard statistics.

**Returns**: 
```typescript
{
  success: boolean
  stats?: {
    totalBookings: number
    totalRevenue: number
    activeServices: number
    activeStaff: number
  }
  recentBookings?: Booking[]
  upcomingAppointments?: Booking[]
  error?: string
}
```

## Error Handling

All server actions:
- Use Zod for input validation
- Return consistent error format: `{ success: boolean, error?: string }`
- Log errors to console
- Use transactions for multi-step operations

## Related Documentation

- [Features](../features/) - Feature-specific actions
- [Database Schema](./database-schema.md) - Data models

## Changelog

- **2025-01-10** - Initial server actions documentation
