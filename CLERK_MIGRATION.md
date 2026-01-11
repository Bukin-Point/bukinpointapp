# Clerk Migration Guide

This document outlines the migration from Better Auth to Clerk for subdomain multi-tenant authentication.

## Prerequisites

1. Create a Clerk account at https://clerk.com
2. Create a new application in Clerk dashboard
3. Configure subdomain cookie domain in Clerk settings

## Environment Variables

Add these to your `.env` file:

```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Cookie Domain for Subdomain Support
# Development
CLERK_DOMAIN=.bukinpoint.test

# Production
CLERK_DOMAIN=.bukinpoint.com
```

## Database Migration

1. Run the Prisma migration to add `clerkUserId` field:

```bash
npx prisma migrate dev --name add_clerk_user_id
```

2. The migration adds `clerkUserId` to the User model to link Clerk users to database users.

## Key Changes

### 1. Authentication Provider
- **Before**: Better Auth (`better-auth`)
- **After**: Clerk (`@clerk/nextjs`)

### 2. Session Management
- **Before**: Custom session management with Better Auth
- **After**: Clerk handles sessions automatically with subdomain cookie support

### 3. Auth Hooks
- **Before**: `useSession()` from Better Auth
- **After**: `useAuth()`, `useUser()` from Clerk + TanStack Query hooks

### 4. Components
- **Before**: Custom signin/signup forms
- **After**: Clerk's `<SignIn />` and `<SignUp />` components

## Migration Steps

### Step 1: Install Dependencies ✅
```bash
yarn add @tanstack/react-query @clerk/nextjs
```

### Step 2: Update Root Layout ✅
- Added `ClerkProvider` wrapper
- Added `QueryProvider` for TanStack Query

### Step 3: Update Middleware
- Integrated Clerk middleware with subdomain handling
- Clerk handles authentication, middleware handles subdomain routing

### Step 4: Update Auth Helpers
- Created `auth-helpers-clerk.ts` to replace Better Auth helpers
- `getSession()` now uses Clerk and syncs users to database

### Step 5: Migrate Components
- Update signin page to use Clerk `<SignIn />` component
- Update signup pages to use Clerk `<SignUp />` component
- Replace all `useEffect` hooks with TanStack Query

### Step 6: Update Database Schema
- Add `clerkUserId` field to User model
- Run migration

### Step 7: Configure Clerk Dashboard
1. Go to Clerk Dashboard → Settings → Domains
2. Add your domain (e.g., `bukinpoint.com`)
3. Configure cookie domain for subdomain support
4. Set up webhooks if needed

## Testing

1. **Test Sign In**:
   - Sign in on main domain
   - Verify session persists on subdomain
   - Check cookies are set with correct domain

2. **Test Sign Up**:
   - Test provider signup flow
   - Test staff signup flow
   - Test customer signup flow

3. **Test Subdomain Access**:
   - Sign in on main domain
   - Navigate to provider subdomain
   - Verify access is granted
   - Test unauthorized access is blocked

## Rollback Plan

If migration fails:
1. Revert to Better Auth by restoring previous `auth.ts` and `auth-client.ts`
2. Remove Clerk dependencies
3. Restore previous middleware
4. Database changes are backward compatible (clerkUserId is optional)

## Notes

- Clerk automatically handles cookie domain for subdomains
- No manual cookie configuration needed
- Session management is handled by Clerk
- User data is synced to database on first sign in
- Better Auth tables (Session, Account, Verification) can be removed after migration
