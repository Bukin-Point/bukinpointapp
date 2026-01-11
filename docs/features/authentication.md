# Authentication

## Overview

BukinPoint uses Better Auth for authentication, supporting three user types: Providers, Staff Members, and Customers. Each user type has distinct signup flows and role-based access control.

## User Stories

- As a **provider**, I want to sign up and create my business profile so that I can manage my services and bookings
- As a **staff member**, I want to accept an invitation and create my account so that I can access the provider dashboard
- As a **customer**, I want to create an account so that I can track my bookings and have faster checkout
- As any **user**, I want to sign in securely so that I can access my dashboard

## User Types

### Provider
- Business owners who manage services, staff, and bookings
- Full access to all provider features
- Created via provider signup at `/signup`

### Staff Member
- Team members invited by providers
- Two roles:
  - **OWNER**: Full access like provider
  - **STAFF**: Limited access (own bookings, availability, read-only services)
- Created via staff invitation acceptance at `/signup/staff?token=...`

### Customer
- End users who make bookings
- Access to customer dashboard and booking history
- Created via customer signup at `/signup/customer`

## Implementation Details

### Authentication Library
- **Better Auth** - Authentication framework
- **Configuration**: `src/lib/auth.ts`
- **Client**: `src/lib/auth-client.ts`
- **Helpers**: `src/lib/auth-helpers.ts`

### Database Models
- **User** - Base user account (email, name, password hash)
- **Session** - Active user sessions
- **Account** - OAuth accounts (if using social auth)
- **Verification** - Email verification tokens

### Key Components

#### Signup Forms
- `src/components/auth/signup-form.tsx` - Provider signup
- `src/components/auth/staff-signup-form.tsx` - Staff signup via invitation
- `src/components/auth/customer-signup-form.tsx` - Customer signup

#### Signin Form
- `src/components/auth/signin-form.tsx` - Universal signin form

### Server Actions
- Better Auth handles signup/signin via API routes
- `src/lib/auth-helpers.ts` provides:
  - `getSession()` - Get current session
  - `getUserType()` - Determine user type (provider/staff/customer)
  - `getRedirectPath()` - Get redirect path based on user type

## User Interface

### Routes

#### Signup Routes
- `/signup` - Provider signup
- `/signup/staff?token=...` - Staff signup (requires invitation token)
- `/signup/customer` - Customer signup

#### Signin Route
- `/signin` - Universal signin page
  - Supports `email` query param for pre-filled email
  - Supports `invitationToken` query param for staff invitations

### Forms

#### Provider Signup Form
- **Fields**: Name, Email, Password, Confirm Password
- **Validation**:
  - Password minimum 8 characters
  - Passwords must match
  - Email must be unique
- **Redirect**: `/onboarding` after successful signup

#### Staff Signup Form
- **Fields**: Name, Email (pre-filled), Password, Confirm Password
- **Validation**: Same as provider signup
- **Process**:
  1. Validates invitation token
  2. Creates user account
  3. Accepts invitation (creates StaffMember record)
  4. Links to provider
- **Redirect**: `/dashboard` after successful signup

#### Customer Signup Form
- **Fields**: Name, Email, Password, Confirm Password
- **Validation**: Same as provider signup
- **Process**:
  1. Creates user account
  2. Links any existing guest bookings with matching email
- **Redirect**: `/customer/dashboard` after successful signup

#### Signin Form
- **Fields**: Email, Password
- **Validation**: Valid email format, non-empty password
- **Process**:
  1. Authenticates with Better Auth
  2. Determines user type
  3. Redirects based on role:
     - Provider → `/dashboard`
     - Staff → `/dashboard`
     - Customer → `/customer/dashboard`

## Role Detection

### User Type Detection
```typescript
getUserType(session) → 'provider' | 'staff' | 'customer' | null
```

**Logic**:
1. Check if user has `Provider` record → `'provider'`
2. Check if user has `StaffMember` record → `'staff'`
3. Otherwise → `'customer'`

### Redirect Logic
```typescript
getRedirectPath(userType) → string
```

- `'provider'` → `/dashboard`
- `'staff'` → `/dashboard` (can access provider dashboard)
- `'customer'` → `/customer/dashboard`
- `null` → `/signin`

## Session Management

### Session Storage
- Sessions stored in database (`Session` model)
- Token-based authentication
- Automatic expiration handling

### Session Access
- Server Components: `await getSession()`
- Client Components: `useSession()` hook from Better Auth

### Protected Routes
- Layout-level protection in route groups:
  - `(provider)/layout.tsx` - Checks provider/staff access
  - `(customer)/layout.tsx` - Checks customer access
  - `(auth)/layout.tsx` - Public routes

## Edge Cases

### Duplicate Email Signup
- **Error**: "Email already registered"
- **Toast notification** shown to user
- **Prevention**: Email uniqueness constraint in database

### Invalid Invitation Token
- **Error**: "Invalid or expired invitation"
- **Redirect**: `/signin` with error message
- **Validation**: Token checked for existence and expiration

### Expired Session
- **Behavior**: Automatic redirect to `/signin`
- **Detection**: Session expiration checked on each request

### Role Conflicts
- **Scenario**: User is both provider and staff
- **Resolution**: Provider role takes precedence
- **Logic**: `getUserType()` checks provider first

## Related Features

- [Provider Onboarding](./provider-onboarding.md) - Post-signup flow for providers
- [Staff Management](./staff-management.md) - Staff invitation system
- [Customer Accounts](./customer-accounts.md) - Customer account features
- [Permissions](../technical/permissions.md) - Role-based access control

## Changelog

- **2025-01-10** - Initial authentication documentation
- **2025-01-10** - Added staff invitation signup flow
- **2025-01-10** - Added customer signup flow
- **2025-01-10** - Documented role-based redirects
