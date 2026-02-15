# RBAC Migration - Code Updates Required

## ✅ Completed
1. Schema updated to use `UserProvider`, `UserProviderRole`, `UserProviderPermission`
2. Removed `StaffMember` model
3. Updated `isUserSuperAdmin()` and `hasPermission()` in `auth-helpers-clerk.ts`
4. Created admin-only seed script
5. Fixed TypeScript type errors in auth helpers

## 📋 Files That Need Updating

### High Priority - Core Auth & Context

#### 1. **src/lib/auth-helpers-clerk.ts**
- Line 157: `getStaffContextFromSession()` - Still uses `staffMember.findFirst()`
- **Action**: Update to use `userProvider.findFirst()` with role checks

#### 2. **src/lib/staff-helpers.ts** 
- Lines 68-110: `getStaffContext()` - Uses `staffMember.findFirst()`
- Lines 135-175: `getInvitedStaffContext()` - Uses `staffMember.findFirst()`
- **Action**: Refactor to use `userProvider` and check roles via `UserProviderRole`

#### 3. **src/lib/staff-helpers-client.ts**
- Multiple references to `staffMember` in context type guards
- **Action**: Update context types to use `userProvider` instead of `staffMember`

#### 4. **src/lib/provider-context-guards.ts**
- Line 29: Uses `staffMember.findFirst()`
- **Action**: Update to use `userProvider.findFirst()`

#### 5. **src/lib/auth-redirect.ts**
- Multiple `staffMember.findFirst()` calls (lines 36, 121, 188)
- **Action**: Update all to use `userProvider`

### Medium Priority - API Routes & Actions

#### 6. **src/app/book/[providerId]/actions.ts**
- Lines 186, 319: `staffMember.findMany()` to get staff list
- **Action**: Update to `userProvider.findMany()` with appropriate filters

#### 7. **src/app/api/webhooks/clerk/route.ts**
- Lines 100, 108: References to `staffMemberships`
- **Action**: Update to use `userProviders`

## 🔑 Key Changes Pattern

**From:**
```typescript
const staffMember = await prisma.staffMember.findFirst({
  where: { userId, providerId }
})
if (staffMember?.role === 'OWNER') { }
```

**To:**
```typescript
const userProvider = await prisma.userProvider.findFirst({
  where: { userId, providerId },
  include: { roles: { include: { role: true } } }
})
const isOwner = userProvider?.roles.some(r => r.role.name === 'OWNER')
```

## 🎯 Next Steps

1. Run: `npx prisma generate && npx prisma db push && npx prisma db seed`
2. Update helper functions (Phase 1)
3. Update API routes (Phase 2)
4. Update frontend (Phase 3)
