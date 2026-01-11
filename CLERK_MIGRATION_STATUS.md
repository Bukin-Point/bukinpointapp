# Clerk Migration Status

## ✅ Completed

1. **Dependencies Installed**
   - `@tanstack/react-query` - For state management without useEffect
   - `@clerk/nextjs` - Authentication provider

2. **Core Setup**
   - ✅ QueryProvider created and added to root layout
   - ✅ ClerkProvider added to root layout
   - ✅ Auth hooks created (`use-auth.ts`) with TanStack Query
   - ✅ Clerk auth helpers created (`auth-helpers-clerk.ts`)

3. **Components Migrated**
   - ✅ Signin page updated to use Clerk `<SignIn />` component
   - ✅ Signin form uses TanStack Query (no useEffect for redirects)

4. **Database Schema**
   - ✅ Added `clerkUserId` field to User model
   - ✅ Schema formatted and ready for migration

5. **Layouts**
   - ✅ Provider layout updated to use Clerk `getSession()`

## 🚧 In Progress

1. **Middleware**
   - Partially updated to integrate Clerk
   - Needs final testing with subdomain routing

2. **Remaining Components**
   - Signup form (provider)
   - Customer signup form
   - Staff signup form

## 📋 Next Steps

### 1. Set Up Clerk Dashboard

1. Go to https://clerk.com and create an account
2. Create a new application
3. Get your API keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Add to `.env`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

### 2. Configure Subdomain Cookie Domain

In Clerk Dashboard:
1. Go to Settings → Domains
2. Add your domain (e.g., `bukinpoint.com`)
3. Configure cookie domain for subdomain support:
   - Development: `.bukinpoint.test`
   - Production: `.bukinpoint.com`

### 3. Run Database Migration

```bash
npx prisma migrate dev --name add_clerk_user_id
```

This will:
- Add `clerkUserId` field to User table
- Create index on `clerkUserId`

### 4. Complete Middleware Integration

The middleware needs to be finalized to:
- Use Clerk's `auth()` for session checking
- Maintain subdomain routing logic
- Handle protected routes properly

### 5. Migrate Remaining Components

- **Signup Form**: Replace with Clerk `<SignUp />` component
- **Customer Signup**: Update to use Clerk
- **Staff Signup**: Update to use Clerk with invitation handling

### 6. Update Auth Actions

- Update `getPostSigninRedirectUrl()` to work with Clerk
- Update all server actions that use `getSession()`

### 7. Testing

1. Test sign in on main domain
2. Test session persistence on subdomain
3. Test all signup flows
4. Test subdomain access control
5. Verify no redirect loops

## 🔄 Migration Pattern

For each component:

1. **Replace Better Auth imports**:
   ```ts
   // Before
   import { useSession, signIn } from '@/lib/auth-client'
   
   // After
   import { useAuth, useUser } from '@clerk/nextjs'
   import { useSession } from '@/hooks/use-auth'
   ```

2. **Replace useEffect with TanStack Query**:
   ```ts
   // Before
   useEffect(() => {
     if (session) {
       router.push('/dashboard')
     }
   }, [session])
   
   // After
   const { data: redirectUrl } = useRedirectAfterAuth('signin')
   // Use redirectUrl in Clerk component's afterSignInUrl prop
   ```

3. **Use Clerk Components**:
   ```tsx
   // Before
   <SignInForm />
   
   // After
   <SignIn 
     routing="path"
     path="/signin"
     afterSignInUrl={redirectUrl}
   />
   ```

## ⚠️ Important Notes

1. **Better Auth Tables**: Can be removed after migration:
   - `Session` table (Clerk manages sessions)
   - `Account` table (Clerk manages accounts)
   - `Verification` table (Clerk manages verification)

2. **User Sync**: Users are automatically synced to database on first sign in via `getSession()` in `auth-helpers-clerk.ts`

3. **Subdomain Cookies**: Clerk automatically handles cookie domain for subdomains when configured in dashboard

4. **No useEffect**: All redirect logic should use TanStack Query or Clerk's built-in redirect handling

## 🐛 Known Issues

- Middleware needs final integration testing
- Redirect logic may need adjustment based on Clerk's behavior
- Staff invitation flow needs to be tested with Clerk

## 📚 Resources

- Clerk Docs: https://clerk.com/docs
- Clerk Next.js: https://clerk.com/docs/quickstarts/nextjs
- TanStack Query: https://tanstack.com/query/latest
