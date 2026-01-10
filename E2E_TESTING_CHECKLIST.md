# E2E Testing Checklist - BukinPoint MVP

This checklist covers all user flows that need to be tested end-to-end.

## Prerequisites
- [ ] Database is set up and migrations are run
- [ ] Redis is running and accessible
- [ ] Environment variables are configured
- [ ] Development server is running (`npm run dev`)

---

## 1. Authentication Flow

### 1.1 User Sign Up
- [ ] Navigate to `/signup`
- [ ] Fill in name, email, password (min 8 chars), confirm password
- [ ] Submit form
- [ ] Verify user is created in database
- [ ] Verify redirect to `/onboarding` (new user) or `/dashboard` (existing provider)
- [ ] Test validation: empty fields, invalid email, short password, mismatched passwords

### 1.2 User Sign In
- [ ] Navigate to `/signin`
- [ ] Enter valid credentials
- [ ] Submit form
- [ ] Verify redirect to `/dashboard` or `/onboarding`
- [ ] Test validation: wrong password, non-existent email
- [ ] Verify session persists on page reload

### 1.3 Protected Routes
- [ ] Try accessing `/dashboard` without authentication
- [ ] Verify redirect to `/signin`
- [ ] Sign in and verify access to protected routes

---

## 2. Provider Onboarding Flow

### 2.1 Complete Onboarding
- [ ] Sign up as new user
- [ ] Navigate to `/onboarding` (should auto-redirect if not completed)
- [ ] Fill in business information:
  - [ ] Business name
  - [ ] Industry
  - [ ] Phone number
  - [ ] Business email
  - [ ] Address (optional)
  - [ ] Timezone
- [ ] Submit form
- [ ] Verify provider is created in database
- [ ] Verify wallet is initialized with balance 0
- [ ] Verify redirect to `/dashboard`
- [ ] Test validation: required fields, invalid email format

### 2.2 Skip Onboarding (Already Provider)
- [ ] Sign in as existing provider
- [ ] Try accessing `/onboarding`
- [ ] Verify redirect to `/dashboard`

---

## 3. Services Management Flow

### 3.1 Create Service
- [ ] Navigate to `/services`
- [ ] Click "Add Service"
- [ ] Fill in service details:
  - [ ] Service name
  - [ ] Description (optional)
  - [ ] Duration (minimum 15 minutes)
  - [ ] Price
  - [ ] Active status
- [ ] Submit form
- [ ] Verify service appears in services list
- [ ] Verify service is saved in database
- [ ] Test validation: empty name, negative price, duration < 15 min

### 3.2 Edit Service
- [ ] Click "Edit" on existing service
- [ ] Modify service details
- [ ] Submit form
- [ ] Verify changes are reflected in list
- [ ] Verify database is updated

### 3.3 Delete Service
- [ ] Click "Delete" on a service
- [ ] Confirm deletion
- [ ] Verify service is removed from list
- [ ] Verify service is deleted from database

### 3.4 Toggle Service Status
- [ ] Create inactive service
- [ ] Verify it doesn't appear in public booking page
- [ ] Activate service
- [ ] Verify it appears in public booking page

---

## 4. Staff Management Flow

### 4.1 Add Staff Member
- [ ] Navigate to `/staff`
- [ ] Click "Add Staff Member"
- [ ] Enter staff email (user must exist - sign up first)
- [ ] Select role (STAFF or OWNER)
- [ ] Assign services (checkboxes)
- [ ] Submit form
- [ ] Verify staff member appears in list
- [ ] Verify staff-service assignments are created
- [ ] Test: Add staff with non-existent email (should show error)

### 4.2 Edit Staff Member
- [ ] Click on staff member
- [ ] Change role
- [ ] Modify service assignments
- [ ] Submit form
- [ ] Verify changes are saved

### 4.3 Activate/Deactivate Staff
- [ ] Toggle staff status
- [ ] Verify status badge updates
- [ ] Verify inactive staff doesn't appear in availability/booking options

### 4.4 Remove Staff Member
- [ ] Click "Remove" on staff member
- [ ] Confirm deletion
- [ ] Verify staff is removed from list

---

## 5. Availability Management Flow

### 5.1 Set Weekly Availability
- [ ] Navigate to `/availability`
- [ ] Select a staff member
- [ ] Click "Add Availability"
- [ ] Select day of week
- [ ] Set start time and end time
- [ ] Submit form
- [ ] Verify availability appears in weekly schedule
- [ ] Test validation: end time before start time, overlapping slots

### 5.2 View Weekly Schedule
- [ ] Select different staff members
- [ ] Verify each staff's schedule displays correctly
- [ ] Verify blocked dates don't show availability

### 5.3 Delete Availability
- [ ] Click "Delete" on availability slot
- [ ] Confirm deletion
- [ ] Verify slot is removed from schedule

### 5.4 Block Specific Date
- [ ] Block a specific date for a staff member
- [ ] Verify date is blocked in calendar
- [ ] Verify blocked date doesn't show available slots

---

## 6. Booking Management (Provider Side)

### 6.1 View Bookings
- [ ] Navigate to `/bookings`
- [ ] Verify all bookings are displayed
- [ ] Verify booking details are correct:
  - [ ] Customer name and contact
  - [ ] Service name
  - [ ] Date and time
  - [ ] Staff member
  - [ ] Status badge

### 6.2 Filter Bookings
- [ ] Filter by status: All, Pending, Confirmed, Completed
- [ ] Verify correct bookings are shown for each filter

### 6.3 Update Booking Status
- [ ] Find a PENDING booking
- [ ] Click "Confirm"
- [ ] Verify status changes to CONFIRMED
- [ ] Click "Mark Completed" on CONFIRMED booking
- [ ] Verify status changes to COMPLETED
- [ ] Click "Cancel" on a booking
- [ ] Verify status changes to CANCELLED
- [ ] Click "No Show" on a booking
- [ ] Verify status changes to NO_SHOW

---

## 7. Public Booking Flow (Customer Side)

### 7.1 Access Public Booking Page
- [ ] Get provider ID from database or dashboard
- [ ] Navigate to `/book/[providerId]`
- [ ] Verify provider information displays
- [ ] Verify active services are listed

### 7.2 Step 1: Select Service
- [ ] View available services
- [ ] Click on a service card
- [ ] Verify service details are shown (duration, price)
- [ ] Click "Select"
- [ ] Verify navigation to time selection

### 7.3 Step 2: Select Date & Time
- [ ] View calendar with next 14 days
- [ ] Click on a date
- [ ] Verify available time slots load
- [ ] Verify slots respect staff availability
- [ ] Verify slots don't show conflicting bookings
- [ ] Click on an available time slot
- [ ] Verify navigation to customer form

### 7.4 Step 3: Customer Information
- [ ] Verify booking summary is displayed
- [ ] Fill in customer details:
  - [ ] Full name (required)
  - [ ] Phone number (required)
  - [ ] Email (optional)
  - [ ] Additional notes (optional)
- [ ] Click "Complete Booking"
- [ ] Verify booking is created in database
- [ ] Verify redirect to confirmation page

### 7.5 Booking Confirmation
- [ ] Verify booking reference is displayed
- [ ] Verify all booking details are correct
- [ ] Verify status is PENDING
- [ ] Test: Access confirmation with invalid booking ref (should show error)

### 7.6 Slot Availability Edge Cases
- [ ] Try booking a slot that's already booked
- [ ] Verify error message appears
- [ ] Try booking during staff's blocked time
- [ ] Verify slot doesn't appear in available slots
- [ ] Try booking outside staff availability hours
- [ ] Verify slot doesn't appear

---

## 8. Redis Slot Locking Flow

### 8.1 Concurrent Booking Prevention
- [ ] Open booking page in two browser windows/tabs
- [ ] Select same service, date, and time in both
- [ ] Start booking process in both simultaneously
- [ ] Complete booking in first window
- [ ] Try to complete booking in second window
- [ ] Verify second booking fails with appropriate error
- [ ] Verify only one booking is created

### 8.2 Lock Expiration
- [ ] Start booking process
- [ ] Wait 5+ minutes (or reduce TTL for testing)
- [ ] Verify lock expires
- [ ] Verify slot becomes available again

---

## 9. Payment Simulation Flow

### 9.1 Process Payment
- [ ] Create a booking (PENDING status)
- [ ] Call payment processing function/server action
- [ ] Verify transaction is created
- [ ] Verify booking payment status changes to PAID
- [ ] Verify wallet balance increases
- [ ] Verify total earnings increases
- [ ] Verify transaction appears in wallet history

### 9.2 Payment Failure
- [ ] Simulate payment failure
- [ ] Verify booking payment status changes to FAILED
- [ ] Verify wallet balance doesn't change
- [ ] Verify lock is released

### 9.3 Wallet View
- [ ] Navigate to `/wallet`
- [ ] Verify current balance displays correctly
- [ ] Verify total earnings displays correctly
- [ ] Verify transaction history shows all transactions
- [ ] Verify transaction details are correct

---

## 10. Error Handling & Edge Cases

### 10.1 Form Validation
- [ ] Test all forms with empty required fields
- [ ] Test email validation
- [ ] Test phone number validation
- [ ] Test numeric field validation (price, duration)
- [ ] Verify error messages display correctly

### 10.2 Database Errors
- [ ] Test with invalid provider ID
- [ ] Test with invalid service ID
- [ ] Test with invalid staff ID
- [ ] Verify appropriate error messages

### 10.3 Network Errors
- [ ] Test with Redis unavailable
- [ ] Test with database unavailable
- [ ] Verify graceful error handling

### 10.4 Authentication Errors
- [ ] Test accessing protected routes without auth
- [ ] Test with expired session
- [ ] Verify redirects work correctly

---

## 11. UI/UX Testing

### 11.1 Responsive Design
- [ ] Test on mobile viewport (< 768px)
- [ ] Test on tablet viewport (768px - 1024px)
- [ ] Test on desktop viewport (> 1024px)
- [ ] Verify all components are usable on mobile

### 11.2 Loading States
- [ ] Verify loading spinners appear during async operations
- [ ] Verify buttons show loading state
- [ ] Verify forms disable during submission

### 11.3 Animations
- [ ] Verify smooth transitions between steps
- [ ] Verify hover effects on interactive elements
- [ ] Verify button animations

### 11.4 Accessibility
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Test with screen reader
- [ ] Verify focus indicators are visible
- [ ] Verify ARIA labels are present
- [ ] Test color contrast

---

## 12. Data Integrity Tests

### 12.1 Relationships
- [ ] Delete a service with bookings (should handle cascade)
- [ ] Delete a staff member with bookings
- [ ] Delete a provider (should handle cascade)
- [ ] Verify foreign key constraints work

### 12.2 Data Consistency
- [ ] Verify wallet balance matches sum of transactions
- [ ] Verify booking dates are in the future
- [ ] Verify time slots don't overlap
- [ ] Verify staff can only be assigned to services they're linked to

---

## 13. Performance Tests

### 13.1 Page Load Times
- [ ] Test initial page load
- [ ] Test navigation between pages
- [ ] Test form submissions
- [ ] Verify acceptable load times (< 2s for most pages)

### 13.2 Database Queries
- [ ] Verify queries are optimized
- [ ] Test with large datasets (100+ bookings, services, staff)
- [ ] Verify pagination works if implemented

---

## Quick Test Script

Run this sequence for a complete flow test:

1. **Setup**: Create test user account
2. **Provider Flow**: Complete onboarding → Add service → Add staff → Set availability
3. **Booking Flow**: Open public booking page → Book service → Complete payment
4. **Management Flow**: View booking → Update status → Check wallet
5. **Cleanup**: Verify all data is consistent

---

## Notes

- Use a test database for E2E tests
- Clear database between test runs or use unique test data
- Consider using Playwright or Cypress for automated E2E tests
- Test with real Redis instance or mock Redis for testing
- Test with different timezones to verify timezone handling
