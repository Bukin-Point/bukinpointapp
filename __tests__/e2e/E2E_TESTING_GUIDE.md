# E2E Testing Guide

This is a comprehensive guide for end-to-end testing of the BukinPoint application, including automated tests and manual testing checklists.

## Table of Contents

1. [Test Data Setup](#test-data-setup)
2. [Running Automated Tests](#running-automated-tests)
3. [Manual Testing Checklist](#manual-testing-checklist)
4. [Troubleshooting](#troubleshooting)

---

## Test Data Setup

### Quick Setup with Seed Script

The easiest way to set up test data is using the Prisma seed script:

```bash
# Run the seed script to create all test data
npx tsx prisma/seed.ts
```

This will create:
- 4 test users (2 providers, 2 staff)
- 2 providers with subdomains
- 6 services (3 per provider)
- 3 staff members with proper role assignments
- All relationships and assignments

### Manual Setup

If you prefer to set up test data manually:

#### 1. Create Provider 1

- Go to `/signup`
- Sign up with: `provider1@test.com` / `Test1234!`
- Complete onboarding:
  - Business Name: `Business One`
  - Industry: Any
  - Phone: `+1234567890`
  - Email: `provider1@test.com`
  - Timezone: `Africa/Lagos`

#### 2. Create Provider 2

- Sign out
- Go to `/signup`
- Sign up with: `provider2@test.com` / `Test1234!`
- Complete onboarding:
  - Business Name: `Business Two`
  - Industry: Any
  - Phone: `+1234567890`
  - Email: `provider2@test.com`
  - Timezone: `Africa/Lagos`

#### 3. Create Staff Member (Single Provider)

- Sign in as Provider 1
- Go to `/staff`
- Invite staff:
  - Email: `staff-single@test.com`
  - Role: `STAFF`
  - Assign some services
- Copy invitation link
- Sign out
- Open invitation link in new browser/incognito
- Sign up with: `staff-single@test.com` / `Test1234!`
- Complete signup

#### 4. Create Staff Member (Multiple Providers)

- Sign in as Provider 1
- Go to `/staff`
- Invite staff:
  - Email: `staff-multi@test.com`
  - Role: `OWNER`
  - Assign some services
- Copy invitation link (don't use it yet)
- Sign out
- Sign in as Provider 2
- Go to `/staff`
- Invite staff:
  - Email: `staff-multi@test.com`
  - Role: `STAFF`
  - Assign some services
- Copy invitation link
- Sign out
- Open invitation link in new browser/incognito
- Sign up with: `staff-multi@test.com` / `Test1234!`
- Complete signup
- Sign in again - should see both providers

### Verify Test Data

After setup, verify:

1. **Provider 1 exists:**
   ```sql
   SELECT * FROM "Provider" WHERE "email" = 'provider1@test.com';
   ```

2. **Provider 2 exists:**
   ```sql
   SELECT * FROM "Provider" WHERE "email" = 'provider2@test.com';
   ```

3. **Staff Single has one provider:**
   ```sql
   SELECT sm.*, p."businessName" 
   FROM "StaffMember" sm
   JOIN "Provider" p ON sm."providerId" = p.id
   JOIN "user" u ON sm."userId" = u.id
   WHERE u.email = 'staff-single@test.com';
   ```
   Should return 1 row.

4. **Staff Multi has two providers:**
   ```sql
   SELECT sm.*, p."businessName", sm.role
   FROM "StaffMember" sm
   JOIN "Provider" p ON sm."providerId" = p.id
   JOIN "user" u ON sm."userId" = u.id
   WHERE u.email = 'staff-multi@test.com';
   ```
   Should return 2 rows (one OWNER, one STAFF).

### Clear All Test Data

To clear all tables and start fresh:

```bash
npx tsx prisma/clear.ts
```

---

## Running Automated Tests

### Prerequisites

1. Development server running: `npm run dev`
2. Database is set up and accessible
3. Redis is running (if needed)
4. Test data is created (see above)

### Run All Tests

```bash
npx playwright test __tests__/e2e/provider-context.test.ts
```

### Run Specific Test Suite

```bash
npx playwright test __tests__/e2e/provider-context.test.ts -g "Staff with Single Provider"
```

### Run in UI Mode (Recommended for debugging)

```bash
npx playwright test --ui
```

### Run in Headed Mode (See browser)

```bash
npx playwright test --headed
```

### Generate Test Report

```bash
npx playwright show-report
```

### Test Coverage

The automated test suite covers:

1. ✅ Single provider staff (no selector)
2. ✅ Multiple provider staff (selector shown)
3. ✅ Provider switching functionality
4. ✅ URL parameter persistence
5. ✅ LocalStorage persistence
6. ✅ Access validation
7. ✅ Access revocation handling
8. ✅ All pages respect context
9. ✅ RBAC permissions per provider
10. ✅ Service filtering per provider
11. ✅ Booking filtering per provider
12. ✅ Navigation link preservation
13. ✅ Error handling
14. ✅ Edge cases

---

## Manual Testing Checklist

### Prerequisites

1. Database is set up with test data
2. Development server is running (`npm run dev`)
3. Test users are created (see test data setup above)

### Test Credentials

- **Provider 1**: `provider1@test.com` / `Test1234!`
- **Provider 2**: `provider2@test.com` / `Test1234!`
- **Staff Single**: `staff-single@test.com` / `Test1234!`
- **Staff Multi**: `staff-multi@test.com` / `Test1234!`

---

### 1. Staff with Single Provider

**Objective**: Verify that staff with only one provider don't see the selector.

**Steps**:
1. Sign in as `staff-single@test.com`
2. Navigate to `/dashboard`

**Expected Results**:
- [ ] No provider selector dropdown is visible
- [ ] Business name "Business One" is displayed in sidebar
- [ ] All pages work normally without `providerId` in URL
- [ ] Navigation works as before

**Test Pages**:
- [ ] Dashboard (`/dashboard`)
- [ ] Services (`/services`)
- [ ] Bookings (`/bookings`)
- [ ] Availability (`/availability`)

---

### 2. Staff with Multiple Providers

**Objective**: Verify that staff with multiple providers can see and use the selector.

**Steps**:
1. Sign in as `staff-multi@test.com`
2. Navigate to `/dashboard`

**Expected Results**:
- [ ] Provider selector dropdown IS visible in sidebar header
- [ ] Both "Business One" and "Business Two" are listed in dropdown
- [ ] Current provider is selected by default
- [ ] Can click selector to see all providers

**Test Switching**:
1. Click provider selector
2. Select "Business Two"
3. Wait for page to update

**Expected Results**:
- [ ] URL updates to include `?providerId=<business-two-id>`
- [ ] Business name changes to "Business Two"
- [ ] Page content updates to show Business Two's data
- [ ] Selector shows "Business Two" as selected

---

### 3. URL Parameter Persistence

**Objective**: Verify that `providerId` is preserved in URL when navigating.

**Steps**:
1. Sign in as `staff-multi@test.com`
2. Select a provider (e.g., Business Two)
3. Note the `providerId` in URL
4. Navigate to different pages:
   - Dashboard → Services → Bookings → Availability

**Expected Results**:
- [ ] `providerId` parameter is present in all URLs
- [ ] Parameter value remains consistent across navigation
- [ ] Page content matches selected provider
- [ ] Direct URL access with `providerId` works (e.g., `/services?providerId=xxx`)

**Test Direct URL Access**:
1. Copy a valid `providerId` from URL
2. Open new tab
3. Navigate to `/dashboard?providerId=<copied-id>`

**Expected Results**:
- [ ] Page loads with correct provider context
- [ ] Selector shows correct provider selected
- [ ] Data matches selected provider

---

### 4. LocalStorage Persistence

**Objective**: Verify that selected provider persists across page refreshes.

**Steps**:
1. Sign in as `staff-multi@test.com`
2. Select a provider (e.g., Business Two)
3. Note the `providerId` in URL
4. Refresh the page (F5 or Cmd+R)

**Expected Results**:
- [ ] Page reloads with same `providerId` in URL
- [ ] Selector shows same provider selected
- [ ] Data matches selected provider

**Test Browser DevTools**:
1. Open DevTools → Application → Local Storage
2. Look for key: `provider-context-storage`
3. Verify value matches current `providerId`

**Expected Results**:
- [ ] Key exists in localStorage
- [ ] Value matches current `providerId`
- [ ] Value updates when provider is switched

---

### 5. Access Validation

**Objective**: Verify that users cannot access providers they don't have permission for.

**Test Invalid ProviderId**:
1. Sign in as `staff-single@test.com` (only has access to Provider 1)
2. Manually change URL to: `/dashboard?providerId=<provider-2-id>`

**Expected Results**:
- [ ] Error message displayed: "You don't have access to this provider"
- [ ] Provider selection component shown
- [ ] Can select valid provider from list
- [ ] After selection, redirects to dashboard with valid provider

**Test XSS/SQL Injection Attempts**:
1. Try URL: `/dashboard?providerId=<script>alert('xss')</script>`
2. Try URL: `/dashboard?providerId='; DROP TABLE users; --`

**Expected Results**:
- [ ] Invalid characters are sanitized
- [ ] Error shown or default provider used
- [ ] No script execution
- [ ] No database errors

---

### 6. Access Revocation

**Objective**: Verify graceful handling when staff loses access to a provider.

**Steps**:
1. Sign in as `staff-multi@test.com`
2. Select Provider 2
3. In another browser/session, sign in as Provider 2 owner
4. Remove staff member's access
5. Go back to first session and refresh page

**Expected Results**:
- [ ] Error message displayed
- [ ] Provider selection component shown
- [ ] Only accessible providers listed
- [ ] Can select another provider
- [ ] After selection, works normally

---

### 7. All Pages Respect Context

**Objective**: Verify that all provider pages filter data by selected provider.

#### Dashboard
1. Select Provider 1
2. Navigate to `/dashboard`
3. Note booking counts, revenue, etc.
4. Switch to Provider 2
5. Refresh dashboard

**Expected Results**:
- [ ] Stats change to reflect Provider 2's data
- [ ] Recent bookings show Provider 2's bookings only
- [ ] Upcoming appointments show Provider 2's appointments only

#### Services
1. Select Provider 1
2. Navigate to `/services`
3. Note services listed
4. Switch to Provider 2
5. Navigate to `/services`

**Expected Results**:
- [ ] Services list shows only Provider 2's services
- [ ] Service count matches Provider 2's services
- [ ] Can create/edit services for Provider 2 (if permissions allow)

#### Bookings
1. Select Provider 1
2. Navigate to `/bookings`
3. Note bookings listed
4. Switch to Provider 2
5. Navigate to `/bookings`

**Expected Results**:
- [ ] Bookings list shows only Provider 2's bookings
- [ ] Booking count matches Provider 2's bookings
- [ ] For STAFF role: Only own bookings shown

#### Staff
1. Select Provider 1
2. Navigate to `/staff`
3. Note staff members listed
4. Switch to Provider 2
5. Navigate to `/staff`

**Expected Results**:
- [ ] Staff list shows only Provider 2's staff
- [ ] Can manage Provider 2's staff (if OWNER role)

#### Availability
1. Select Provider 1
2. Navigate to `/availability`
3. Note availability settings
4. Switch to Provider 2
5. Navigate to `/availability`

**Expected Results**:
- [ ] Availability shows only Provider 2's staff availability
- [ ] For STAFF role: Only own availability shown

#### Wallet
1. Select Provider 1
2. Navigate to `/wallet`
3. Note wallet balance
4. Switch to Provider 2
5. Navigate to `/wallet`

**Expected Results**:
- [ ] Wallet shows Provider 2's balance
- [ ] Transactions show Provider 2's transactions only

#### Settings
1. Select Provider 1
2. Navigate to `/settings/business`
3. Note business details
4. Switch to Provider 2
5. Navigate to `/settings/business`

**Expected Results**:
- [ ] Business details show Provider 2's information
- [ ] Can update Provider 2's details (if OWNER role)

---

### 8. RBAC Permissions Per Provider

**Objective**: Verify that permissions work correctly per provider context.

**Test OWNER Role**:
1. Sign in as `staff-multi@test.com`
2. Select Provider 1 (where user is OWNER)
3. Check navigation sidebar

**Expected Results**:
- [ ] "Staff" link visible
- [ ] "Wallet" link visible
- [ ] "Settings" link visible
- [ ] Can access all routes

**Test STAFF Role**:
1. Same user, select Provider 2 (where user is STAFF)
2. Check navigation sidebar

**Expected Results**:
- [ ] "Staff" link NOT visible
- [ ] "Wallet" link NOT visible
- [ ] "Settings" link NOT visible
- [ ] Can only access: Dashboard, Bookings, Services, Availability

**Test Service Editing**:
1. As OWNER on Provider 1: Can edit services
2. As STAFF on Provider 2: Cannot edit services (read-only)

**Test Booking Viewing**:
1. As OWNER on Provider 1: See all bookings
2. As STAFF on Provider 2: See only own bookings

---

### 9. Service Filtering Per Provider

**Objective**: Verify that STAFF role only sees assigned services per provider.

**Steps**:
1. Sign in as `staff-multi@test.com`
2. Select Provider 2 (STAFF role)
3. Navigate to `/services`

**Expected Results**:
- [ ] Only services assigned to this staff member are shown
- [ ] Badge displays: "Showing X of Y services assigned to you"
- [ ] Cannot see unassigned services
- [ ] Cannot edit services (read-only)

**Test with Multiple Providers**:
1. Assign different services to staff in Provider 1 vs Provider 2
2. Switch between providers
3. Verify services list changes correctly

---

### 10. Booking Filtering Per Provider

**Objective**: Verify that STAFF role only sees own bookings per provider.

**Steps**:
1. Sign in as `staff-multi@test.com`
2. Select Provider 2 (STAFF role)
3. Navigate to `/bookings`

**Expected Results**:
- [ ] Only bookings assigned to this staff member are shown
- [ ] Cannot see other staff's bookings
- [ ] Booking count matches own bookings only

**Test with OWNER Role**:
1. Switch to Provider 1 (OWNER role)
2. Navigate to `/bookings`

**Expected Results**:
- [ ] All bookings for Provider 1 are shown
- [ ] Can see all staff's bookings

---

### 11. Navigation Link Preservation

**Objective**: Verify that all navigation links preserve `providerId`.

**Steps**:
1. Sign in as `staff-multi@test.com`
2. Select a provider
3. Note the `providerId` in URL
4. Hover over navigation links (Dashboard, Services, Bookings, etc.)

**Expected Results**:
- [ ] All links include `?providerId=<current-provider-id>`
- [ ] Clicking links preserves `providerId`
- [ ] Quick action links (Add Service, Add Staff) preserve `providerId`

**Test Link Hrefs**:
1. Right-click on navigation link
2. Copy link address
3. Verify it contains `providerId` parameter

---

### 12. Error Handling

**Test Invalid ProviderId**:
1. Sign in as `staff-multi@test.com`
2. Manually navigate to: `/dashboard?providerId=invalid-id-12345`

**Expected Results**:
- [ ] Error component displayed
- [ ] Error message: "You don't have access to this provider or the provider doesn't exist"
- [ ] Provider selection dropdown shown
- [ ] Can select valid provider from list
- [ ] After selection, redirects to dashboard

**Test ProviderId Removal**:
1. Sign in and select a provider
2. Manually remove `providerId` from URL
3. Refresh page

**Expected Results**:
- [ ] Either restores from localStorage or uses default provider
- [ ] Page still loads correctly
- [ ] No errors displayed

**Test LocalStorage Corruption**:
1. Open DevTools → Application → Local Storage
2. Set `provider-context-storage` to invalid value
3. Refresh page

**Expected Results**:
- [ ] Invalid value is cleared
- [ ] Default provider is used
- [ ] No errors displayed

---

### 13. Edge Cases

**Test Rapid Switching**:
1. Sign in as `staff-multi@test.com`
2. Rapidly switch between providers (5-10 times quickly)

**Expected Results**:
- [ ] No errors occur
- [ ] Final provider is correctly selected
- [ ] URL matches final selection
- [ ] Data loads correctly

**Test Concurrent Sessions**:
1. Open two browser windows
2. Sign in as `staff-multi@test.com` in both
3. Select different providers in each window
4. Navigate in both windows

**Expected Results**:
- [ ] Each window maintains its own provider context
- [ ] No interference between sessions
- [ ] Both work independently

**Test Browser Back/Forward**:
1. Select Provider 1
2. Navigate to Services
3. Switch to Provider 2
4. Navigate to Bookings
5. Click browser back button

**Expected Results**:
- [ ] Browser back navigates correctly
- [ ] Provider context is preserved
- [ ] URL shows correct `providerId`

---

## Troubleshooting

### "Sign in failed" errors
- Verify test users exist in database
- Check passwords match `Test1234!`
- Ensure Better Auth is working

### "Timeout waiting for /dashboard"
- Check if user completed onboarding
- Verify user has provider access
- Check browser console for errors

### "Provider selector not found"
- Verify staff member has multiple providers
- Check that providers are ACTIVE
- Verify staff memberships are active

### Tests timeout on signin
- Check if dev server is running on port 3000
- Verify no compilation errors in terminal
- Check browser console for errors

### Tests fail with "element not found"
- Verify test users exist in database
- Check that signin is working manually
- Increase timeout in `playwright.config.ts`

### Tests fail with authentication errors
- Verify test user credentials
- Check database for user records
- Ensure Better Auth is configured correctly

### Next.js Dev Overlay
The automated tests include helper functions to dismiss the Next.js dev overlay that can block interactions. If you see errors about overlays blocking clicks, the helpers should handle this automatically.

---

## Test Completion Checklist

- [ ] All test scenarios completed
- [ ] All expected results verified
- [ ] No errors or unexpected behavior
- [ ] Performance is acceptable
- [ ] Security validations working
- [ ] RBAC permissions correct per provider
- [ ] Data filtering working correctly
- [ ] URL and localStorage persistence working

---

## Known Issues / Notes

Document any issues found during testing:

1. **Issue**: [Description]
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]
   - **Severity**: [High/Medium/Low]

---

## Test Environment

- **Browser**: [Chrome/Firefox/Safari/Edge]
- **Version**: [Version number]
- **OS**: [Operating system]
- **Date**: [Test date]
- **Tester**: [Tester name]
