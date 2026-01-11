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
- Test users (providers and staff)
- Providers with subdomains
- Services
- Staff members with proper role assignments
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

#### 3. Create Staff Member

- Sign in as Provider 1
- Go to `/staff`
- Invite staff:
  - Email: `staff1@test.com`
  - Role: `STAFF`
  - Assign some services
- Copy invitation link
- Sign out
- Open invitation link in new browser/incognito
- Sign up with: `staff1@test.com` / `Test1234!`
- Complete signup
- Should redirect to `/dashboard` (staff don't need onboarding)

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

3. **Staff member has one provider:**
   ```sql
   SELECT sm.*, p."businessName" 
   FROM "StaffMember" sm
   JOIN "Provider" p ON sm."providerId" = p.id
   JOIN "user" u ON sm."userId" = u.id
   WHERE u.email = 'staff1@test.com';
   ```
   Should return 1 row (single provider constraint enforced).

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
5. Clerk authentication is configured with test keys

### Run All Tests

```bash
npx playwright test __tests__/e2e/
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

1. ✅ Single provider per user (enforced constraint)
2. ✅ No provider selector (removed from UI)
3. ✅ Simple URL structure (no providerId parameters)
4. ✅ Access validation
5. ✅ All pages work without providerId
6. ✅ RBAC permissions
7. ✅ Service filtering for staff
8. ✅ Booking filtering for staff
9. ✅ Navigation links
10. ✅ Error handling
11. ✅ Onboarding flow
12. ✅ Staff invitation acceptance

---

## Manual Testing Checklist

### Prerequisites

1. Database is set up with test data
2. Development server is running (`npm run dev`)
3. Test users are created (see test data setup above)
4. Clerk authentication is configured

### Test Credentials

- **Provider 1**: `provider1@test.com` / `Test1234!`
- **Provider 2**: `provider2@test.com` / `Test1234!`
- **Staff 1**: `staff1@test.com` / `Test1234!`

---

### 1. Provider Signup and Onboarding

**Objective**: Verify that new providers can sign up and complete onboarding.

**Steps**:
1. Navigate to `/signup`
2. Fill in signup form:
   - Name: `Test Provider`
   - Email: `newprovider@test.com`
   - Password: `Test1234!`
   - Confirm Password: `Test1234!`
3. Submit form
4. Complete CAPTCHA if shown
5. Wait for redirect

**Expected Results**:
- [ ] Redirects to `/onboarding?flow=provider-signup`
- [ ] Onboarding form is displayed
- [ ] Can fill in business details
- [ ] Can submit onboarding form
- [ ] Redirects to `/dashboard` after submission
- [ ] `onboardingCompleted` field is set to `true` in database
- [ ] Provider record is created
- [ ] Wallet is initialized with balance 0

---

### 2. Staff Invitation and Acceptance

**Objective**: Verify that providers can invite staff and staff can accept invitations.

**Steps - Provider Side**:
1. Sign in as Provider 1
2. Navigate to `/staff`
3. Click "Invite Staff" button
4. Fill invitation form:
   - Email: `newstaff@test.com`
   - Role: `STAFF`
   - Select services (optional)
5. Submit form

**Expected Results**:
- [x] Invitation is created
- [x] Email is sent (if email service configured)
- [ ] Invitation link is displayed
- [ ] Cannot invite email that belongs to a provider
- [ ] Cannot invite email that is already staff for another provider
- [ ] Cannot invite same email twice (pending invitation check)

**Steps - Staff Side**:
1. Open invitation link in new browser/incognito
2. Should see staff signup page at `/signup/staff?token=...`
3. Email should be pre-filled
4. Fill signup form:
   - Name: `Test Staff`
   - Email: (pre-filled, should match invitation)
   - Password: `Test1234!`
   - Confirm Password: `Test1234!`
5. Submit form

**Expected Results**:
- [ ] Redirects to `/signup/staff/accept?token=...`
- [ ] Invitation is accepted automatically
- [ ] StaffMember record is created
- [ ] `onboardingCompleted` is set to `true` (staff don't need onboarding)
- [ ] Redirects to `/dashboard`
- [ ] Can access provider dashboard
- [ ] Cannot accept another invitation (single provider constraint)

---

### 3. Staff Signin (Existing User)

**Objective**: Verify that existing staff members can sign in and access dashboard.

**Steps**:
1. Navigate to `/signin`
2. Enter credentials:
   - Email: `staff1@test.com`
   - Password: `Test1234!`
3. Submit form

**Expected Results**:
- [ ] Redirects to `/auth/redirect`
- [ ] System checks for pending invitations
- [ ] System checks `onboardingCompleted` status
- [ ] Redirects to `/dashboard` (staff don't need onboarding)
- [ ] Dashboard loads correctly
- [ ] Business name is displayed in sidebar
- [ ] No provider selector is shown (single provider)

---

### 4. Provider Signin

**Objective**: Verify that providers can sign in and access dashboard.

**Steps**:
1. Navigate to `/signin`
2. Enter credentials:
   - Email: `provider1@test.com`
   - Password: `Test1234!`
3. Submit form

**Expected Results**:
- [ ] Redirects to `/auth/redirect`
- [ ] System checks `onboardingCompleted` status
- [ ] If onboarding not completed, redirects to `/onboarding`
- [ ] If onboarding completed, redirects to `/dashboard`
- [ ] Dashboard loads correctly
- [ ] Business name is displayed in sidebar
- [ ] All navigation links are visible

---

### 5. Single Provider Constraint

**Objective**: Verify that users can only be associated with one provider.

**Test Case 1 - Staff Cannot Accept Second Invitation**:
1. Sign in as Provider 1
2. Invite `staff1@test.com` (already staff for Provider 1)
3. Sign out
4. Sign in as Provider 2
5. Try to invite `staff1@test.com`

**Expected Results**:
- [ ] Error message: "This user is already a staff member for another provider"
- [ ] Invitation is not created

**Test Case 2 - Provider Cannot Become Staff**:
1. Sign in as Provider 1
2. Sign out
3. Sign in as Provider 2
4. Try to invite `provider1@test.com`

**Expected Results**:
- [ ] Error message: "This email address belongs to a business owner"
- [ ] Invitation is not created

**Test Case 3 - Staff Cannot Create Provider**:
1. Sign in as `staff1@test.com`
2. Try to access `/onboarding` directly
3. Try to create a provider profile

**Expected Results**:
- [ ] Redirects to `/dashboard` (staff don't need onboarding)
- [ ] Cannot create provider profile (already staff)

---

### 6. URL Structure (No providerId)

**Objective**: Verify that URLs are simple and don't contain providerId parameters.

**Steps**:
1. Sign in as any user (provider or staff)
2. Navigate through different pages:
   - Dashboard → Services → Bookings → Availability → Staff → Wallet → Settings

**Expected Results**:
- [ ] URLs are simple: `/dashboard`, `/services`, `/bookings`, etc.
- [ ] No `providerId` parameter in URLs
- [ ] Navigation works correctly
- [ ] Direct URL access works (e.g., `/services` loads correctly)
- [ ] Browser back/forward works correctly

---

### 7. Access Control and Permissions

**Objective**: Verify that RBAC permissions work correctly.

**Test as Provider (OWNER role)**:
1. Sign in as Provider 1
2. Check navigation sidebar

**Expected Results**:
- [ ] All navigation links visible:
  - Dashboard
  - Bookings
  - Services
  - Staff
  - Availability
  - Wallet
  - Settings
- [ ] Can access all routes
- [ ] Can manage staff
- [ ] Can edit services
- [ ] Can view all bookings
- [ ] Can manage wallet
- [ ] Can update business settings

**Test as Staff (STAFF role)**:
1. Sign in as `staff1@test.com`
2. Check navigation sidebar

**Expected Results**:
- [ ] Limited navigation links visible:
  - Dashboard
  - Bookings
  - Services
  - Availability
- [ ] Hidden links (not visible):
  - Staff
  - Wallet
  - Settings
- [ ] Cannot access `/staff` (redirects or shows error)
- [ ] Cannot access `/wallet` (redirects or shows error)
- [ ] Cannot access `/settings` (redirects or shows error)
- [ ] Can view only own bookings (if STAFF role)
- [ ] Can view only assigned services (if STAFF role)
- [ ] Cannot edit services (read-only)

---

### 8. Service Filtering for Staff

**Objective**: Verify that STAFF role only sees assigned services.

**Steps**:
1. Sign in as `staff1@test.com`
2. Navigate to `/services`

**Expected Results**:
- [ ] Only services assigned to this staff member are shown
- [ ] Badge displays: "Showing X of Y services assigned to you" (if applicable)
- [ ] Cannot see unassigned services
- [ ] Cannot edit services (read-only)
- [ ] Service list is filtered correctly

---

### 9. Booking Filtering for Staff

**Objective**: Verify that STAFF role only sees own bookings.

**Steps**:
1. Sign in as `staff1@test.com`
2. Navigate to `/bookings`

**Expected Results**:
- [ ] Only bookings assigned to this staff member are shown
- [ ] Cannot see other staff's bookings
- [ ] Booking count matches own bookings only
- [ ] Booking list is filtered correctly

**Test as Provider**:
1. Sign in as Provider 1
2. Navigate to `/bookings`

**Expected Results**:
- [ ] All bookings for Provider 1 are shown
- [ ] Can see all staff's bookings
- [ ] Booking count matches all bookings

---

### 10. Onboarding Flow

**Objective**: Verify that onboarding works correctly for new providers.

**Test Case 1 - New Provider**:
1. Sign up as new provider
2. Should redirect to `/onboarding?flow=provider-signup`

**Expected Results**:
- [ ] Onboarding page is accessible
- [ ] Can fill in business details
- [ ] Can submit form
- [ ] Redirects to `/dashboard` after submission
- [ ] `onboardingCompleted` is set to `true`

**Test Case 2 - Provider Without Onboarding**:
1. Sign in as provider who hasn't completed onboarding
2. Try to access `/dashboard`

**Expected Results**:
- [ ] Redirects to `/onboarding`
- [ ] Cannot access dashboard until onboarding completed

**Test Case 3 - Staff (No Onboarding Needed)**:
1. Sign in as staff member
2. Try to access `/onboarding` directly

**Expected Results**:
- [ ] Redirects to `/dashboard`
- [ ] Staff don't need onboarding
- [ ] `onboardingCompleted` is automatically set to `true` when staff member is created

---

### 11. Error Handling

**Test Invalid Access**:
1. Sign in as `staff1@test.com`
2. Try to access `/staff` directly (STAFF role cannot access)

**Expected Results**:
- [ ] Error message displayed or redirects
- [ ] Cannot access restricted routes
- [ ] Error handling is graceful

**Test Invalid Invitation**:
1. Try to access `/signup/staff?token=invalid-token`

**Expected Results**:
- [ ] Error message: "Invalid or expired invitation"
- [ ] Redirects to signin or shows error

**Test Expired Invitation**:
1. Create invitation
2. Manually expire it in database
3. Try to accept it

**Expected Results**:
- [ ] Error message: "Invitation has expired"
- [ ] Cannot accept expired invitation

---

### 12. Edge Cases

**Test Rapid Navigation**:
1. Sign in as any user
2. Rapidly navigate between pages (5-10 times quickly)

**Expected Results**:
- [ ] No errors occur
- [ ] Final page loads correctly
- [ ] Navigation is smooth

**Test Browser Back/Forward**:
1. Navigate: Dashboard → Services → Bookings
2. Click browser back button
3. Click browser forward button

**Expected Results**:
- [ ] Browser back navigates correctly
- [ ] Browser forward navigates correctly
- [ ] Page state is preserved
- [ ] No errors displayed

**Test Concurrent Sessions**:
1. Open two browser windows
2. Sign in as same user in both
3. Navigate in both windows

**Expected Results**:
- [ ] Each window works independently
- [ ] No interference between sessions
- [ ] Both work correctly

---

## Troubleshooting

### "Sign in failed" errors
- Verify test users exist in database
- Check passwords match `Test1234!`
- Ensure Clerk is configured correctly
- Check Clerk dashboard for user status

### "Timeout waiting for /dashboard"
- Check if user completed onboarding
- Verify user has provider access
- Check browser console for errors
- Verify Clerk session is valid

### "Onboarding page redirects immediately"
- Check if `onboardingCompleted` is already `true`
- Verify user is not staff (staff don't need onboarding)
- Check flow parameter in URL

### Tests timeout on signin
- Check if dev server is running on port 3000
- Verify no compilation errors in terminal
- Check browser console for errors
- Verify Clerk keys are correct

### Tests fail with "element not found"
- Verify test users exist in database
- Check that signin is working manually
- Increase timeout in `playwright.config.ts`
- Verify Clerk components are rendering

### Tests fail with authentication errors
- Verify test user credentials
- Check database for user records
- Ensure Clerk is configured correctly
- Verify Clerk webhooks are set up (if using)

### CAPTCHA errors
- Check Clerk CAPTCHA configuration
- Verify browser extensions aren't blocking CAPTCHA
- Check network connectivity
- Review Clerk dashboard for CAPTCHA settings

### Next.js Dev Overlay
The automated tests include helper functions to dismiss the Next.js dev overlay that can block interactions. If you see errors about overlays blocking clicks, the helpers should handle this automatically.

---

## Test Completion Checklist

- [ ] All test scenarios completed
- [ ] All expected results verified
- [ ] No errors or unexpected behavior
- [ ] Performance is acceptable
- [ ] Security validations working
- [ ] RBAC permissions correct
- [ ] Data filtering working correctly
- [ ] Onboarding flow working
- [ ] Staff invitations working
- [ ] Single provider constraint enforced

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

---

## Architecture Notes

### Key Changes from Previous Version

1. **Single Provider Constraint**: Each user can only be associated with one provider (either as owner or staff). This is enforced at the database level with a unique constraint on `StaffMember.userId`.

2. **No Provider Selector**: The provider selector UI component has been removed since users can only have one provider.

3. **Simple URLs**: URLs no longer contain `providerId` parameters. All provider pages work with the user's single provider context.

4. **Clerk Authentication**: The application now uses Clerk for authentication instead of Better Auth. All signin/signup flows use Clerk components.

5. **Onboarding Tracking**: The `onboardingCompleted` field in the User model tracks whether a user has completed onboarding. Staff members automatically have this set to `true` when created.

6. **Root Domain Only**: Providers and staff work on the root domain only. Subdomains are reserved for customer booking pages.

### Database Constraints

- `StaffMember.userId` has a unique constraint (enforced at database level)
- `Provider.userId` has a unique constraint (one provider per user)
- Staff cannot be created if user already has a provider
- Provider cannot be created if user already has a staff membership

### Authentication Flow

1. **Provider Signup**: `/signup` → Clerk signup → `/onboarding?flow=provider-signup` → Complete onboarding → `/dashboard`
2. **Staff Signup**: `/signup/staff?token=...` → Clerk signup → `/signup/staff/accept?token=...` → Accept invitation → `/dashboard`
3. **Customer Signup**: `/signup/customer` → Clerk signup → `/customer/dashboard?flow=customer-signup`
4. **Signin**: `/signin` → Clerk signin → `/auth/redirect` → Check onboarding → `/dashboard` or `/onboarding`
