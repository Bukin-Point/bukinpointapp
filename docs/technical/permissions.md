# Permissions & Access Control

## Overview

BukinPoint uses role-based access control (RBAC) with three user types and two staff roles. Access is controlled at the route, component, and data levels.

## User Types

### Provider
- Business owners
- Full access to all provider features
- Created via provider signup

### Staff Member
- Team members invited by providers
- Two roles:
  - **OWNER**: Full access like provider
  - **STAFF**: Limited access

### Customer
- End users making bookings
- Access to customer dashboard and booking history

## Permission Matrix

| Feature | Provider | Staff (OWNER) | Staff (STAFF) | Customer |
|---------|----------|---------------|---------------|----------|
| **Dashboard** | ✅ Provider | ✅ Provider | ✅ Provider (filtered) | ✅ Customer |
| **Services** | ✅ Full | ✅ Full | ✅ Read-only | ❌ |
| **Bookings** | ✅ All | ✅ All | ✅ Own only | ✅ Own only |
| **Staff Management** | ✅ | ✅ | ❌ | ❌ |
| **Availability** | ✅ All | ✅ All | ✅ Own only | ❌ |
| **Wallet** | ✅ | ✅ | ❌ | ❌ |
| **Settings** | ✅ | ✅ | ❌ | ✅ (Profile) |
| **Customer Dashboard** | ❌ | ❌ | ❌ | ✅ |
| **Public Booking** | ❌ | ❌ | ❌ | ✅ |

## Implementation

### Access Context

```typescript
type AccessContext = StaffContext | ProviderContext
```

- **ProviderContext**: Direct provider access
- **StaffContext**: Staff access via `staffMember.providerId`

### Helper Functions

#### `getProviderAccess(userId)`
- Gets provider access context (provider or staff)
- Returns `AccessContext | null`

#### `canManageStaff(context)`
- Returns `true` for providers and OWNER role
- Returns `false` for STAFF role

#### `canEditServices(context)`
- Returns `true` for providers and OWNER role
- Returns `false` for STAFF role

#### `canViewAllBookings(context)`
- Returns `true` for providers and OWNER role
- Returns `false` for STAFF role (sees own only)

#### `isStaff(context)`
- Returns `true` if user is staff (not provider)
- Used for UI differentiation

## Route Protection

### Provider Routes (`(provider)/`)
- Layout checks: `getProviderAccess()`
- Redirects to `/onboarding` if no access
- Staff members access via `staffMember.providerId`

### Customer Routes (`(customer)/`)
- Layout checks: Customer access only
- Redirects providers/staff to their dashboards

### Public Routes (`(auth)/`, `/book/`)
- No authentication required
- Public booking pages accessible to all

## Data Filtering

### Bookings
- **Provider/OWNER**: All provider bookings
- **STAFF**: Filtered by `staffId = staffMember.id`
- **Customer**: Filtered by `userId = customer.id`

### Dashboard Stats
- **Provider/OWNER**: All provider stats
- **STAFF**: Filtered stats (own bookings only)
- Revenue, services, staff counts hidden for STAFF

### Services
- **Provider/OWNER**: Full CRUD access
- **STAFF**: Read-only (no edit/delete buttons)

### Availability
- **Provider/OWNER**: Can manage all staff availability
- **STAFF**: Can only manage own availability

## Component-Level Permissions

### Navigation
- `ProviderNav` hides restricted routes for STAFF role
- Wallet, Settings, Staff links hidden for STAFF

### Forms
- Edit/Delete buttons conditionally rendered
- Based on `canEditServices()`, `canManageStaff()`

### Data Display
- Stats cards conditionally rendered
- Revenue hidden for STAFF role

## File Locations

- **Helpers**: `src/lib/staff-helpers.ts`
- **Layout**: `src/app/(provider)/layout.tsx`
- **Navigation**: `src/components/provider/provider-nav.tsx`

## Related Documentation

- [Staff Management](../features/staff-management.md) - Staff roles
- [Authentication](../features/authentication.md) - User types
- [Architecture](../ARCHITECTURE.md) - System design

## Changelog

- **2025-01-10** - Initial permissions documentation
- **2025-01-10** - Added hybrid staff access pattern
