# Authentication Redirect System

## Overview

Centralized redirect logic that handles all post-signup and post-signin redirects based on user type and authentication flow context. This prevents race conditions and ensures users are always redirected to the correct destination.

## Architecture

### Centralized Redirect System

**File**: `src/lib/auth-redirect.ts`

Single source of truth for all authentication redirects. Handles:
- Provider signup → `/onboarding`
- Staff signup → `/dashboard`
- Customer signup → `/customer/dashboard`
- Signin → Role-based dashboard

### Key Functions

#### `getUserType(userId: string)`
Determines user type from database:
1. Checks for Provider record → `'provider'`
2. Checks for StaffMember record → `'staff'`
3. Default → `'customer'`

#### `getRedirectContext(userId, flow?)`
Gets complete redirect context including:
- User type
- Authentication flow (provider-signup, staff-signup, customer-signup, signin)
- Needs onboarding flag

#### `getRedirectPath(context: RedirectContext)`
Returns the correct redirect path based on context:
- **Provider signup flow**: Always `/onboarding` (even if no provider record yet)
- **Staff signup flow**: `/dashboard`
- **Customer signup flow**: `/customer/dashboard`
- **Signin flow**: Role-based dashboard

## Flow Handling

### Provider Signup Flow

1. User signs up at `/signup`
2. `onSuccess` callback sets `justSignedUp` flag
3. Redirects to `/onboarding?flow=provider-signup`
4. `useEffect` checks flow parameter and respects it
5. Onboarding page checks flow parameter and allows access

**Why this works:**
- Flow parameter prevents race condition
- `justSignedUp` flag prevents useEffect from running immediately
- Onboarding page respects flow parameter

### Staff Signup Flow

1. User signs up at `/signup/staff?token=...`
2. Redirects to `/signup/staff?token=...&signup=success`
3. `useEffect` accepts invitation and redirects to `/dashboard`

### Customer Signup Flow

1. User signs up at `/signup/customer`
2. Redirects to `/customer/dashboard?flow=customer-signup`
3. `useEffect` respects flow parameter

### Signin Flow

1. User signs in at `/signin`
2. System checks for pending invitations (staff)
3. Determines user type from database
4. Redirects to appropriate dashboard

## Race Condition Prevention

### Problem
After signup, Better Auth creates a session immediately. A `useEffect` hook that checks session and redirects can run before the intended redirect, causing incorrect routing.

### Solution
1. **Flow Parameters**: Pass `?flow=provider-signup` to indicate the signup flow
2. **State Flags**: Use `justSignedUp` flag to prevent immediate redirects
3. **Context-Aware Redirects**: Check flow parameter in redirect logic

## Implementation Details

### Signup Form (`signup-form.tsx`)
```typescript
// Prevents race condition
const [justSignedUp, setJustSignedUp] = useState(false)

onSuccess: () => {
  setJustSignedUp(true) // Prevent useEffect
  router.push('/onboarding?flow=provider-signup')
}

useEffect(() => {
  if (session?.user?.id && !justSignedUp) {
    // Check flow parameter
    const flow = urlParams.get('flow')
    if (flow === 'provider-signup') {
      router.push('/onboarding?flow=provider-signup')
      return
    }
    // ... other redirects
  }
}, [session, justSignedUp])
```

### Onboarding Page (`onboarding/page.tsx`)
```typescript
// Respects flow parameter
const params = await searchParams
const flow = params?.flow

// Allow access if flow=provider-signup (even if no provider record yet)
if (accessContext && flow !== 'provider-signup') {
  redirect('/dashboard')
}
```

## Benefits

1. **Single Source of Truth**: All redirects go through one function
2. **Flow Awareness**: System knows which flow user is in
3. **Race Condition Safe**: Prevents incorrect redirects
4. **Maintainable**: Easy to update redirect logic in one place
5. **Type Safe**: TypeScript types for all flows and contexts

## Migration Notes

- Old `getUserTypeAction` and `getRedirectPath` from `auth-utils.ts` are replaced
- New system is backward compatible (still works for signin flows)
- All auth components updated to use new system

## Testing

Test each flow:
1. Provider signup → Should go to `/onboarding`
2. Staff signup → Should go to `/dashboard`
3. Customer signup → Should go to `/customer/dashboard`
4. Signin (provider) → Should go to `/dashboard`
5. Signin (staff) → Should go to `/dashboard`
6. Signin (customer) → Should go to `/customer/dashboard`
