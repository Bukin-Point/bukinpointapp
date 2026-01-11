# Dashboard

## Overview

Dashboards provide overview of key metrics, recent activity, and quick actions for providers, staff, and customers.

## User Stories

- As a **provider**, I want to see business metrics so that I can track performance
- As a **staff member**, I want to see my bookings so that I can manage my schedule
- As a **customer**, I want to see my bookings so that I can track appointments

## Implementation Details

### Provider Dashboard
- **Route**: `/dashboard`
- **Access**: Providers, Staff (OWNER), Staff (STAFF)
- **Components**:
  - `src/components/provider/stats-card.tsx` - Statistics cards
  - `src/components/provider/recent-bookings.tsx` - Recent bookings
  - `src/components/provider/upcoming-appointments.tsx` - Upcoming appointments

### Customer Dashboard
- **Route**: `/customer/dashboard`
- **Access**: Customers only
- **Components**: Booking history and statistics

### Staff Dashboard Access
- Staff members access provider dashboard via hybrid access pattern
- Data filtered based on role:
  - **OWNER**: All provider data
  - **STAFF**: Own bookings only

## Dashboard Metrics

### Provider Dashboard Stats
- Total Bookings
- Total Revenue (providers/OWNER only)
- Active Services (providers/OWNER only)
- Active Staff (providers/OWNER only)

### Staff Dashboard Stats
- Total Bookings (own only)
- Upcoming Appointments (own only)

### Customer Dashboard Stats
- Total Bookings
- Upcoming Bookings
- Past Bookings

## Edge Cases

### No Data
- **Display**: Empty states with helpful messages
- **Actions**: Quick action buttons to create first item

### Permission-Based Filtering
- **Staff (STAFF)**: Only see own bookings
- **Staff (OWNER)**: See all provider bookings

## Related Features

- [Bookings](./bookings.md) - Booking data
- [Services Management](./services-management.md) - Service metrics
- [Wallet](./wallet.md) - Revenue data

## Changelog

- **2025-01-10** - Initial dashboard documentation
- **2025-01-10** - Added staff dashboard access
