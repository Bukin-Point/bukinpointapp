# RBAC Migration - Files Remaining

## ✅ Critical Files Updated (Build-Breaking)
- ✅ `src/actions/auth.ts` - getUserTypeAction()
- ✅ `src/actions/dashboard.ts` - getDashboardStats()
- ✅ `src/lib/staff-helpers.ts`
- ✅ `src/lib/staff-helpers-client.ts`
- ✅ `src/lib/auth-helpers-clerk.ts`
- ✅ `src/lib/provider-context-guards.ts`
- ✅ `src/lib/auth-redirect.ts`

## ⏳ Non-Critical Files (Can Update Later)

These files still reference `staffMember` but may not break the build if they're not imported during the initial page load:

### Staff Management Pages:
1. **`src/app/(provider)/staff/page.tsx`** - Line 51
   - Staff listing page
   - Update when accessing staff management

2. **`src/actions/staff.ts`** - Lines 39, 134, 148
   - Staff CRUD operations
   - Update when managing staff members

3. **`src/actions/staff-invitations.ts`** - Lines 44, 223, 246, 412
   - Staff invitation system
   - Update when inviting new staff

4. **`src/actions/provider-context.ts`** - Line 43
   - Provider context management
   - Update when switching providers

### Booking-Related Pages:
5. **`src/app/book/[providerId]/actions.ts`** - Lines 186, 319
   - Booking flow actions
   - Update when customers book appointments

6. **`src/app/(provider)/bookings/page.tsx`** - Lines 62, 144
   - Bookings listing page
   - Update when viewing bookings

7. **`src/app/(provider)/availability/page.tsx`** - Lines 53, 76
   - Availability management
   - Update when managing availability

8. **`src/actions/availability.ts`** - Line 103
   - Availability CRUD
   - Update when editing availability

### Customer Pages:
9. **`src/app/(customer)/layout.tsx`** - Line 26
   - Customer layout
   - Update when customers access their dashboard

## 🎯 Recommended Update Order

### Phase 1: Test Current Build ✅
Run the build and see if it succeeds with the critical files updated.

### Phase 2: Update Staff Management (High Priority)
- `src/actions/staff.ts`
- `src/actions/staff-invitations.ts`
- `src/app/(provider)/staff/page.tsx`
- `src/actions/provider-context.ts`

### Phase 3: Update Booking System (Medium Priority)
- `src/app/book/[providerId]/actions.ts`
- `src/app/(provider)/bookings/page.tsx`
- `src/app/(provider)/availability/page.tsx`
- `src/actions/availability.ts`

### Phase 4: Update Customer Pages (Low Priority)
- `src/app/(customer)/layout.tsx`

## 📝 Update Pattern

For all remaining files, follow this pattern:

### Finding Staff by User ID:
```typescript
// OLD
const staffMember = await prisma.staffMember.findFirst({
  where: { userId, providerId }
})

// NEW
const userProvider = await prisma.userProvider.findFirst({
  where: { userId, providerId }
})
```

### Listing All Staff:
```typescript
// OLD
const staff = await prisma.staffMember.findMany({
  where: { providerId, isActive: true }
})

// NEW
const staff = await prisma.userProvider.findMany({
  where: { 
    providerId, 
    isActive: true,
    roles: { 
      some: { 
        role: { name: { in: ['OWNER', 'STAFF'] } } 
      } 
    }
  },
  include: {
    user: { select: { id: true, name: true, email: true } },
    roles: { include: { role: true } }
  }
})
```

### Booking References:
```typescript
// OLD
bookingWhere.staffId = staffMember.id

// NEW
bookingWhere.userProviderId = userProvider.id
```

## ⚠️ Known Issues

### Old Seed File Errors
The `prisma/seed.ts` file has lint errors but is **NOT USED**. We're using `prisma/seed-admin-only.ts` instead. These errors can be ignored or the file can be deleted.

---

**Last Updated:** 2026-02-15T20:06:00+01:00
