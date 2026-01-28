# Availability Management

## Overview

Staff members and providers can set weekly availability schedules. Availability defines working hours for each day of the week, which determines available booking slots.

## User Stories

- As a **staff member**, I want to set my availability so that customers can book with me
- As a **provider**, I want to view staff availability so that I can manage schedules
- As a **provider**, I want to set availability for staff so that I can control working hours

## Implementation Details

### Server Actions
- **File**: `src/actions/availability.ts`
- **Functions**:
  - `createAvailability()` - Create availability slot
  - `updateAvailability()` - Update availability
  - `deleteAvailability()` - Delete availability

### Database Models
- **Availability** - Availability records
- **StaffMember** - Staff members

### Key Components
- `src/components/provider/availability-manager.tsx` - Availability management UI
- `src/components/provider/availability-form.tsx` - Availability creation form

## User Interface

### Route
- `/availability` - Availability management page

### Availability Form
- **Staff Member** - Select staff (providers/OWNER can select any, STAFF sees only self)
- **Day of Week** - Select day (0-6, Sunday-Saturday)
- **Start Time** - Time input (HH:MM format)
- **End Time** - Time input (HH:MM format)
- **Blocked** - Checkbox for blocking specific dates

### Permissions
- **Provider**: Can manage all staff availability
- **Staff (OWNER)**: Can manage all staff availability
- **Staff (STAFF)**: Can only manage own availability

## Edge Cases

### Timezone Handling
- **Issue**: Availability stored in provider's timezone
- **Solution**: Convert times based on provider timezone setting
- **Display**: Show times in provider's timezone

### Overlapping Availability
- **Validation**: Check for overlapping time slots
- **Behavior**: Allow multiple slots per day (e.g., 9-12, 13-17)

## Related Features

- [Bookings](./bookings.md) - Availability used for slot calculation
- [Staff Management](./staff-management.md) - Staff availability

## Changelog

- **2025-01-10** - Initial availability documentation
