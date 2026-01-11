# E2E Testing Checklist - BukinPoint MVP

This checklist covers all user flows that need to be tested end-to-end.

## Prerequisites
- [x] Database is set up and migrations are run
- [x] Redis is running and accessible
- [x] Environment variables are configured
- [x] Development server is running (`npm run dev`)

---

## 1. Authentication Flow

### 1.1 User Sign Up
- [x] Navigate to `/signup`
- [x] Fill in name, email, password (min 8 chars), confirm password
- [x] Submit form
- [x] Verify user is created in database
- [x] Verify redirect to `/onboarding` (new user) or `/dashboard` (existing provider)
- [x] Test validation: empty fields, invalid email, short password, mismatched passwords

### 1.2 User Sign In
- [x] Navigate to `/signin`
- [x] Enter valid credentials
- [x] Submit form
- [x] Verify redirect to `/dashboard` or `/onboarding`
- [x] Test validation: wrong password, non-existent email
- [x] Verify session persists on page reload

### 1.3 Protected Routes
- [x] Try accessing `/dashboard` without authentication
- [x] Verify redirect to `/signin`
- [x] Sign in and verify access to protected routes

---

## 2. Provider Onboarding Flow

### 2.1 Complete Onboarding
- [x] Sign up as new user
- [x] Navigate to `/onboarding` (should auto-redirect if not completed)
- [x] Fill in business information:
  - [x] Business name
  - [x] Industry
  - [x] Phone number
  - [x] Business email
  - [x] Address (optional)
  - [x] Timezone
- [x] Submit form
- [x] Verify provider is created in database
- [x] Verify wallet is initialized with balance 0
- [x] Verify redirect to `/dashboard`
- [x] Test validation: required fields, invalid email format
- [ ] **NEW**: Verify subdomain is auto-generated from business name
- [ ] **NEW**: Verify subdomain is stored in database (check `subdomain` field)
- [ ] **NEW**: Verify subdomain URL is displayed in success toast message
- [ ] **NEW**: Test subdomain generation with special characters (e.g., "Migdalá Business" → "migdal-business")
- [ ] **NEW**: Test subdomain generation with spaces (e.g., "My Business" → "my-business")
- [ ] **NEW**: Test duplicate business names (second should get suffix like "my-business-1")
- [ ] **NEW**: Test reserved subdomain handling (e.g., "www" → "www-biz")

### 2.2 Skip Onboarding (Already Provider)
- [x] Sign in as existing provider
- [x] Try accessing `/onboarding`
- [x] Verify redirect to `/dashboard`

---

## 3. Services Management Flow

### 3.1 Create Service
- [x] Navigate to `/services`
- [x] Click "Add Service"
- [x] Fill in service details:
  - [x] Service name
  - [x] Description (optional)
  - [x] Duration (minimum 15 minutes)
  - [x] Price
  - [x] Active status
- [x] Submit form
- [x] Verify service appears in services list
- [x] Verify service is saved in database
- [x] Test validation: empty name, negative price, duration < 15 min

### 3.2 Edit Service
- [x] Click "Edit" on existing service
- [x] Modify service details
- [x] Submit form
- [x] Verify changes are reflected in list
- [x] Verify database is updated

### 3.3 Delete Service
- [x] Click "Delete" on a service
- [x] Confirm deletion
- [x] Verify service is removed from list
- [x] Verify service is deleted from database

### 3.4 Toggle Service Status
- [x] Create inactive service
- [ ] Verify it doesn't appear in public booking page
- [ ] Activate service
- [ ] Verify it appears in public booking page

---

## 4. Staff Management Flow

### 4.1 Send Staff Invitation
- [x] Navigate to `/staff`
- [x] Click "Add Staff Member"
- [x] Enter staff email
- [x] Select role (STAFF or OWNER)
- [x] Assign services (checkboxes)
- [x] Click "Send Invitation"
- [x] Verify invitation is created in database
- [x] Verify invitation token is generated
- [x] Verify success message is shown
- [x] Test: Send invitation to email that already has pending invitation (should show error)
- [x] Test: Send invitation to email that's already a staff member (should show error)

### 4.2 Staff Sign Up via Invitation
- [x] Get invitation token from provider (or check console in dev mode)
- [x] Navigate to `/signup/staff?token={token}`
- [x] Verify invitation details are displayed (provider name, role)
- [x] Verify email is pre-filled and disabled
- [x] Fill in name, password, confirm password
- [x] Submit form
- [x] Verify user account is created
- [x] Verify staff member is created and linked to provider
- [x] Verify service assignments are applied
- [x] Verify invitation is marked as accepted
- [x] Verify redirect to sign in page
- [x] Test: Invalid token (should show error)
- [x] Test: Expired invitation (should show error)
- [x] Test: Already accepted invitation (should show error)

### 4.3 Accept Invitation After Sign In
- [x] Sign in with email that has pending invitation
- [x] If invitation token in URL, verify redirect to accept invitation page
- [x] Verify invitation is accepted automatically
- [x] Verify staff member is created
- [ ] Verify redirect to dashboard

### 4.4 Edit Staff Member
- [x] Click "Edit" on existing staff member
- [x] Change role
- [x] Modify service assignments
- [ ] Submit form
- [x] Verify changes are saved
- [x] Verify changes are reflected in list

### 4.5 Activate/Deactivate Staff
- [x] Toggle staff status
- [x] Verify status badge updates
- [x] Verify inactive staff doesn't appear in availability/booking options

### 4.6 Remove Staff Member
- [x] Click "Remove" on staff member
- [x] Confirm deletion
- [x] Verify staff is removed from list

---

## 5. Availability Management Flow

### 5.1 Set Weekly Availability
- [x] Navigate to `/availability`
- [x] Select a staff member
- [x] Click "Add Availability"
- [x] Select day of week
- [x] Set start time and end time
- [x] Submit form
- [x] Verify availability appears in weekly schedule
- [x] Test validation: end time before start time, overlapping slots

### 5.2 View Weekly Schedule
- [ ] Select different staff members
- [ ] Verify each staff's schedule displays correctly
- [ ] Verify blocked dates don't show availability

### 5.3 Delete Availability
- [x] Click "Delete" on availability slot
- [x] Confirm deletion
- [x] Verify slot is removed from schedule

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
- [ ] **As Guest User:**
  - [ ] Verify "Sign in" link is shown
  - [ ] Fill in customer details:
    - [ ] Full name (required)
    - [ ] Phone number (required)
    - [ ] Email (optional)
    - [ ] Additional notes (optional)
  - [ ] Click "Complete Booking"
  - [ ] Verify booking is created in database (without userId)
  - [ ] Verify redirect to confirmation page
- [ ] **As Logged-in Customer:**
  - [ ] Sign in as customer first
  - [ ] Navigate to booking page
  - [ ] Verify name and email are pre-filled
  - [ ] Fill in phone number
  - [ ] Click "Complete Booking"
  - [ ] Verify booking is created with userId linked
  - [ ] Verify booking appears in customer dashboard

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

## 8. Customer Account Flow

### 8.1 Customer Sign Up
- [ ] Navigate to `/signup/customer`
- [ ] Fill in name, email, password (min 8 chars), confirm password
- [ ] Submit form
- [ ] Verify user account is created
- [ ] Verify redirect to `/customer/dashboard`
- [ ] Test validation: empty fields, invalid email, short password, mismatched passwords
- [ ] Test: Sign up with existing email (should show error)

### 8.2 Customer Sign In
- [ ] Navigate to `/signin`
- [ ] Enter customer credentials
- [ ] Submit form
- [ ] Verify redirect to `/customer/dashboard`
- [ ] Verify session persists on page reload

### 8.3 Customer Dashboard
- [ ] Sign in as customer
- [ ] Navigate to `/customer/dashboard`
- [ ] Verify stats are displayed (total bookings, upcoming, past)
- [ ] Verify upcoming bookings section shows future bookings
- [ ] Verify past bookings section shows completed/cancelled bookings
- [ ] Verify booking details are correct (service, date, time, staff, price)
- [ ] Test: Customer with no bookings (should show empty state)

### 8.4 Customer Bookings Page
- [ ] Navigate to `/customer/bookings`
- [ ] Verify all bookings are listed
- [ ] Verify bookings are sorted by date (newest first)
- [ ] Verify booking status badges are displayed correctly
- [ ] Verify booking details are complete

### 8.5 Customer Profile Page
- [ ] Navigate to `/customer/profile`
- [ ] Verify account information is displayed (name, email, member since)
- [ ] Verify information is correct

### 8.6 Link Existing Bookings to Account
- [ ] Create a booking as guest with email
- [ ] Sign up as customer with same email
- [ ] Navigate to customer dashboard
- [ ] Verify guest booking is linked to customer account
- [ ] Verify booking appears in customer's booking history

### 8.7 Logged-in Customer Booking Flow
- [ ] Sign in as customer
- [ ] Navigate to public booking page
- [ ] Complete booking flow
- [ ] Verify customer information is pre-filled
- [ ] Verify booking is linked to customer account
- [ ] Verify booking appears in customer dashboard immediately

### 8.8 Role-based Redirects
- [ ] Sign in as provider → verify redirect to `/dashboard`
- [ ] Sign in as staff → verify redirect to `/dashboard`
- [ ] Sign in as customer → verify redirect to `/customer/dashboard`
- [ ] Test: Provider trying to access `/customer/dashboard` (should redirect to provider dashboard)
- [ ] Test: Customer trying to access `/dashboard` (should redirect to customer dashboard)

---

## 9. Redis Slot Locking Flow

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

## 10. Payment Simulation Flow

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

## 11. Error Handling & Edge Cases

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

---

## 14. Subdomain Functionality (NEW)

### 14.1 Subdomain Generation
- [ ] Create provider with business name "Migdalá Business"
- [ ] Verify subdomain generated: `migdal-business` (lowercase, special chars removed)
- [ ] Verify subdomain stored in database with unique constraint
- [ ] Create second provider with same business name
- [ ] Verify second gets unique subdomain: `migdal-business-1`
- [ ] Test business name that would generate reserved subdomain (e.g., "www")
- [ ] Verify reserved subdomain gets suffix: `www-biz`
- [ ] Test very long business name (>63 chars)
- [ ] Verify subdomain truncated to 63 characters (DNS limit)
- [ ] Test empty/null business name edge case
- [ ] Verify fallback subdomain generated (e.g., `business-{timestamp}`)

### 14.2 Subdomain Routing (Middleware)
- [ ] **Local Development**: Configure hosts file with `.local` domains
- [ ] **Local Development**: Visit `http://migdala.bukinpoint.local:3000`
- [ ] Verify middleware extracts subdomain correctly
- [ ] Verify middleware queries database for provider
- [ ] Verify request rewrites to `/book/[providerId]`
- [ ] Verify booking page loads with correct provider data
- [ ] **Production**: Visit `https://migdala.bukinpoint.com` (after Vercel setup)
- [ ] Verify HTTPS works with subdomain
- [ ] Verify SSL certificate is valid for subdomain
- [ ] Test: Visit `https://invalid-subdomain.bukinpoint.com`
- [ ] Verify redirects to main domain or shows appropriate error
- [ ] Test: Visit `https://www.bukinpoint.com` (main domain)
- [ ] Verify normal app behavior (no subdomain routing)

### 14.3 Subdomain Display
- [ ] Complete provider onboarding
- [ ] Verify success toast shows subdomain URL
- [ ] Verify URL format is correct (e.g., `migdala.bukinpoint.com`)
- [ ] **Local Dev**: Verify shows `.local` domain format
- [ ] **Production**: Verify shows production domain format

### 14.4 Backward Compatibility
- [ ] Verify existing `/book/[providerId]` URLs still work
- [ ] Verify direct providerId access doesn't break
- [ ] Verify both subdomain and direct URL show same booking page
- [ ] Test: Access booking page with both methods simultaneously
- [ ] Verify data consistency between both access methods

### 14.5 Edge Cases
- [ ] Test subdomain with numbers: "Business 123" → "business-123"
- [ ] Test subdomain with hyphens: "My-Business" → "my-business"
- [ ] Test subdomain with multiple spaces: "My  Business" → "my-business"
- [ ] Test subdomain uniqueness with 10+ providers with similar names
- [ ] Verify incremental suffix works correctly (1, 2, 3, etc.)
- [ ] Test subdomain generation during high concurrency (multiple signups)

### 14.6 Vercel Configuration Verification
- [ ] Verify `bukinpoint.com` added to Vercel domains
- [ ] Verify `*.bukinpoint.com` wildcard added to Vercel domains
- [ ] Verify DNS records configured at registrar
- [ ] Verify DNS propagation complete
- [ ] Verify SSL certificates active for subdomains
- [ ] Test subdomain routing in production environment

---

## Notes

- Use a test database for E2E tests
- Clear database between test runs or use unique test data
- Consider using Playwright or Cypress for automated E2E tests
- Test with real Redis instance or mock Redis for testing
- Test with different timezones to verify timezone handling
- **For subdomain testing**: Configure `/etc/hosts` for local development (see plan documentation)
- **For production subdomain testing**: Ensure Vercel wildcard domain is configured (see VERCEL_SUBDOMAIN_SETUP.md)