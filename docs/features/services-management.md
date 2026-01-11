# Services Management

## Overview

Providers can create and manage services offered to customers. Services include name, description, duration, price, and can be assigned to staff members. Staff members with STAFF role have read-only access.

## User Stories

- As a **provider**, I want to create services so that customers can book them
- As a **provider**, I want to update service details so that I can keep information current
- As a **provider**, I want to activate/deactivate services so that I can control availability
- As a **staff member**, I want to view services so that I can see what's available

## Implementation Details

### Server Actions
- **File**: `src/actions/services.ts`
- **Functions**:
  - `createService()` - Create new service
  - `updateService()` - Update existing service
  - `deleteService()` - Delete service

### Database Models
- **Service** - Service records
- **StaffService** - Staff-service assignments

### Key Components
- `src/components/provider/service-list.tsx` - Service list display
- `src/components/provider/service-form.tsx` - Service creation/editing form

## User Interface

### Route
- `/services` - Services management page

### Service Form Fields
- **Service Name** (required) - Text input
- **Description** (optional) - Textarea
- **Duration** (required) - Number input (minutes, min 15, step 15)
- **Price** (required) - Number input (₦, min 0, step 0.01)
- **Active Status** - Checkbox (default: true)

### Permissions
- **Provider**: Full access (create, edit, delete)
- **Staff (OWNER)**: Full access
- **Staff (STAFF)**: Read-only access

## Edge Cases

### Decimal Serialization
- **Issue**: Prisma Decimal fields can't be serialized to client components
- **Solution**: Convert to Number before passing to client
- **Implementation**: Server component converts `price` to number

### Service Deletion
- **Validation**: Check for existing bookings
- **Behavior**: Soft delete or prevent deletion if bookings exist (future)

## Related Features

- [Staff Management](./staff-management.md) - Service assignments
- [Bookings](./bookings.md) - Services in bookings

## Changelog

- **2025-01-10** - Initial services documentation
- **2025-01-10** - Added role-based permissions
