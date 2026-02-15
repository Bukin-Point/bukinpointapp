# RBAC Implementation Plan - UserProvider Migration

## 🎯 Objective
Update all code from `StaffMember` model to use the new `UserProvider` RBAC system.

## ✅ Prerequisites (COMPLETED)
- [x] Schema updated with UserProvider, UserProviderRole, UserProviderPermission
- [x] Prisma Client regenerated (`npx prisma generate`)
- [x] Database schema applied (`npx prisma db push`)
- [x] Admin user seeded (`npx prisma db seed`)
- [x] Core auth functions updated: `hasPermission()`, `isUserSuperAdmin()`

## 📋 Implementation Phases

### Phase 1: Core Helper Functions (DO FIRST)
These are foundational - everything else depends on them.

#### 1.1 Update `src/lib/staff-helpers.ts`
**Current Issues:**
- `getStaffContext()` uses `staffMember.findFirst()`
- `getInvitedStaffContext()` uses `staffMember.findFirst()`
- Returns `staffMember` object with `role` field

**Changes Needed:**
```typescript
// OLD
const staffMember = await prisma.staffMember.findFirst({
  where: { userId, providerId },
  include: { provider: true }
})

// NEW
const userProvider = await prisma.userProvider.findFirst({
  where: { userId, providerId },
  include: { 
    provider: true,
    roles: { include: { role: true } },
    permissions: { include: { permission: true } }
  }
})
```

**Return Type Update:**
```typescript
// Update return type from:
staffMember: { id, providerId, role, userId }

// To:
userProvider: { 
  id, 
  providerId, 
  userId,
  roles: [{ role: { name } }],
  permissions: [{ permission: { name } }]
}
```

#### 1.2 Update `src/lib/staff-helpers-client.ts`
**Current Issues:**
- Type guards check `'staffMember' in context`
- Accesses `context.staffMember.role`

**Changes Needed:**
- Update type definitions to use `userProvider`
- Update role checks to: `userProvider.roles.some(r => r.role.name === 'OWNER')`
- Create helper function: `getUserProviderRoles(userProvider)`

#### 1.3 Update `src/lib/auth-helpers-clerk.ts`
**Function:** `getStaffContextFromSession()`
**Line:** 157

**Changes Needed:**
```typescript
// OLD
const staffMember = await prisma.staffMember.findFirst({
  where: { userId: user.id, providerId },
  include: { provider: true }
})

// NEW
const userProvider = await prisma.userProvider.findFirst({
  where: { userId: user.id, providerId },
  include: { 
    provider: true,
    roles: { include: { role: true } }
  }
})

// Check if user has any role in this provider
if (!userProvider || userProvider.roles.length === 0) {
  return null
}
```

#### 1.4 Update `src/lib/provider-context-guards.ts`
**Line:** 29

**Changes Needed:**
```typescript
// Replace staffMember.findFirst() with userProvider.findFirst()
// Update status check logic
```

#### 1.5 Update `src/lib/auth-redirect.ts`
**Lines:** 36, 121, 188

**Changes Needed:**
- Replace all `staffMember.findFirst()` with `userProvider.findFirst()`
- Update provider access checks
- Update subdomain retrieval logic

---

### Phase 2: API Routes & Actions

#### 2.1 Update `src/app/book/[providerId]/actions.ts`
**Lines:** 186, 319

**Current:**
```typescript
const staff = await prisma.staffMember.findMany({
  where: { providerId }
})
```

**New:**
```typescript
const staff = await prisma.userProvider.findMany({
  where: { 
    providerId,
    isActive: true,
    roles: { some: { role: { name: { in: ['OWNER', 'STAFF'] } } } }
  },
  include: {
    user: { select: { id: true, name: true, email: true } },
    roles: { include: { role: true } }
  }
})
```

#### 2.2 Update `src/app/api/webhooks/clerk/route.ts`
**Lines:** 100, 108

**Changes:**
- Replace `staffMemberships` with `userProviders`
- Update user lookup to include `userProviders`

---

### Phase 3: Type Definitions & Interfaces

#### 3.1 Create New Type Definitions
**File:** `src/types/rbac.ts` (NEW)

```typescript
export type UserProviderContext = {
  userProvider: {
    id: string
    providerId: string
    userId: string
    isOwner: boolean
    roles: Array<{ role: { name: string } }>
    permissions: Array<{ permission: { name: string } }>
  }
  provider: {
    id: string
    businessName: string
    userId: string
    industry: string | null
    businessImage: string | null
  }
}

export type ProviderContext = {
  provider: {
    id: string
    businessName: string
    userId: string
  }
}

export type AppContext = UserProviderContext | ProviderContext

// Helper function
export function hasRole(context: UserProviderContext, roleName: string): boolean {
  return context.userProvider.roles.some(r => r.role.name === roleName)
}

export function isOwner(context: AppContext): boolean {
  if ('userProvider' in context) {
    return context.userProvider.isOwner || hasRole(context, 'OWNER')
  }
  return false
}
```

---

### Phase 4: Frontend Components (Search & Update)

#### 4.1 Find Components Using Staff Context
```bash
# Search for staff-related code
grep -r "staffMember" src/app
grep -r "getStaffContext" src/app
grep -r "isStaffOwner" src/app
```

#### 4.2 Update Components
- Replace `staffMember` references with `userProvider`
- Update role checks to use helper functions
- Update permission checks to use `hasPermission()`

---

## 🔧 Helper Functions to Create

### 1. Role Check Helper
```typescript
// src/lib/rbac-helpers.ts
export function hasRole(
  userProvider: { roles: Array<{ role: { name: string } }> },
  roleName: string
): boolean {
  return userProvider.roles.some(r => r.role.name === roleName)
}
```

### 2. Permission Check Wrapper
```typescript
// For client components
export async function checkPermission(
  userId: string,
  providerId: string,
  permission: string
): Promise<boolean> {
  return hasPermission(userId, providerId, permission)
}
```

---

## 🧪 Testing Checklist

After each phase:
- [ ] No TypeScript errors
- [ ] Application builds successfully
- [ ] Login flow works
- [ ] Provider dashboard accessible
- [ ] Role-based features work
- [ ] Permission checks function correctly

---

## 🚀 Execution Order

1. **Create type definitions** (`src/types/rbac.ts`)
2. **Create helper functions** (`src/lib/rbac-helpers.ts`)
3. **Update `staff-helpers.ts`** (core context functions)
4. **Update `staff-helpers-client.ts`** (client helpers)
5. **Update `auth-helpers-clerk.ts`** (getStaffContextFromSession)
6. **Update `provider-context-guards.ts`**
7. **Update `auth-redirect.ts`**
8. **Update booking actions**
9. **Update webhooks**
10. **Search and update frontend components**
11. **Comprehensive testing**

---

## 📝 Notes

- Keep backward compatibility where possible during transition
- Test after each file update
- Use `hasPermission()` for new permission checks
- Preserve existing functionality while adapting to new structure
