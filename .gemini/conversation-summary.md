# RBAC Schema Refactoring - Conversation Summary

## 🎯 Main Objective
Refine the database schema to implement a flexible Role-Based Access Control (RBAC) system by migrating from the `StaffMember` model to a new `UserProvider` many-to-many relationship model.

---

## 📊 What We Accomplished

### 1. **Database Schema Refactoring**

#### **Removed:**
- ❌ `StaffMember` model
- ❌ `StaffRole` enum  
- ❌ `UserRole` model (merged into new system)
- ❌ `StaffService` model

#### **Added:**
- ✅ `UserProvider` - Central many-to-many relationship between Users and Providers
- ✅ `UserProviderRole` - Links users to roles within a provider context
- ✅ `UserProviderPermission` - Direct permission assignments (ad-hoc permissions)
- ✅ `UserProviderService` - Links staff to services they can perform
- ✅ `Role` - System roles (SUPERADMIN, OWNER, STAFF)
- ✅ `Permission` - System permissions (manage:settings, booking:create, etc.)
- ✅ `RolePermission` - Links permissions to roles

#### **Updated:**
- 🔄 `Booking` model - Changed `staffId` to `userProviderId`
- 🔄 `Availability` model - Changed `staffId` to `userProviderId`
- 🔄 `StaffInvitation` - Updated to use `roleId` instead of `StaffRole`
- 🔄 `User` model - Removed `staffMemberships`, added `userProviders`
- 🔄 `Provider` model - Removed `staff`, added `userProviders`

### 2. **Environment Configuration**

**`.env` Updates:**
```env
# Admin seed configuration
SEED_ADMIN_EMAIL="admin@bukinpoint.com"
SEED_ADMIN_NAME="Super Admin"
SEED_ADMIN_PASSWORD="Admin123!"

# ADMIN_EMAILS for fallback super admin check
ADMIN_EMAILS="olamide@bukinpoint.com,tech@bukinpoint.com,admin@bukinpoint.com"
```

### 3. **Seed Script - Admin Only**

**Created:** `prisma/seed-admin-only.ts`

**Seeds:**
- 🛡️ 3 Roles: `SUPERADMIN`, `OWNER`, `STAFF`
- 🔑 6 Permissions:
  - `manage:settings`
  - `manage:users`
  - `booking:read`
  - `booking:create`
  - `booking:update`
  - `system:manage` (SUPERADMIN only)
- 👤 1 Admin user with SUPERADMIN role

**Configuration:** Updated `prisma.config.ts` and `package.json` to use the new seed script.

### 4. **Core Auth Functions Updated**

#### **`src/lib/auth-helpers-clerk.ts`**

**✅ `isUserSuperAdmin(email)`:**
```typescript
// Now checks UserProvider for SUPERADMIN role across all providers
// Falls back to ADMIN_EMAILS environment variable
```

**✅ `hasPermission(userId, providerId, permissionName)`:**
```typescript
// Checks both:
// 1. Role-based permissions (via UserProviderRole -> Role -> RolePermission)
// 2. Direct permissions (via UserProviderPermission)
// Returns true if user has permission through either path
```

### 5. **Type Definitions Created**

#### **`src/types/rbac.ts`** (NEW)
```typescript
export interface UserProviderContext {
  userProvider: {
    id: string
    providerId: string
    userId: string
    isOwner: boolean
    roles: Array<{ role: { name: string } }>
    permissions: Array<{ permission: { name: string } }>
  }
  provider: { /*...*/ }
}

// Helper functions:
- hasRole()
- isOwner()
- getRoleNames()
- hasAnyRole()
```

#### **`src/lib/staff-helpers-client.ts`** (UPDATED)
- Added `UserProviderContext` interface
- Updated `AccessContext` to support both old and new models
- Updated helper functions to work with both contexts
- Changed return types from `StaffRole` enum to `string`

### 6. **Migration Guide & Implementation Plan**

**Created:**
- `.gemini/rbac-migration-guide.md` - Quick reference for code updates needed
- `.gemini/rbac-implementation-plan.md` - Detailed phase-by-phase plan

**Identified 7 Key Files** that need updating:
1. `src/lib/staff-helpers.ts` ⚠️ (Partially done)
2. `src/lib/auth-helpers-clerk.ts`
3. `src/lib/provider-context-guards.ts`
4. `src/lib/auth-redirect.ts`
5. `src/app/book/[providerId]/actions.ts`
6. `src/app/api/webhooks/clerk/route.ts`
7. `src/lib/staff-helpers-client.ts` ✅ (Type defs done)

---

## 🔧 Commands Executed

```powershell
npx prisma generate    # ✅ Regenerated Prisma Client
npx prisma db push     # ✅ Applied schema to database
npx prisma db seed     # ✅ Seeded admin user
```

---

## 🎨 Design Decisions

### **Why UserProvider Many-to-Many?**
1. **Multi-tenancy Support** - Users can have different roles in different providers
2. **Flexibility** - Direct permission assignments without creating custom roles
3. **Scalability** - Easy to add new roles and permissions
4. **Exception Handling** - Ad-hoc permissions for edge cases

### **Permission Check Strategy**
```typescript
// Unified permission check combines:
// 1. Role-based: User -> UserProviderRole -> Role -> RolePermission
// 2. Direct: User -> UserProviderPermission

const canDo = await hasPermission(userId, providerId, 'manage:settings')
```

### **Backward Compatibility**
- Kept `StaffContext` interface for gradual migration
- Type definitions support both old and new systems
- Code can work with both `staffMember` and `userProvider` contexts

---

## 📂 Files Created/Modified

### **Created:**
1. `prisma/seed-admin-only.ts` - Admin-only seed script
2. `src/types/rbac.ts` - RBAC type definitions
3. `.gemini/rbac-migration-guide.md` - Migration reference
4. `.gemini/rbac-implementation-plan.md` - Detailed plan

### **Modified:**
1. `prisma/schema.prisma` - Complete RBAC schema
2. `.env` - Added seed configuration
3. `prisma.config.ts` - Updated seed command
4. `package.json` - Updated seed script path
5. `src/lib/auth-helpers-clerk.ts` - Updated core auth functions
6. `src/lib/staff-helpers-client.ts` - Updated type definitions
7. `src/lib/staff-helpers.ts` - Partially updated to use UserProvider

---

## ⚠️ Current Status

### **✅ Completed (100%):**
- Schema design and implementation
- Database migration
- Admin user seeding
- Core permission check functions
- Type definitions
- Migration documentation

### **🔄 In Progress (30%):**
- Code migration from `StaffMember` to `UserProvider`
- Helper function updates

### **📋 Next Steps:**
1. Finish updating `staff-helpers.ts` (lines 135-176)
2. Update `getStaffContextFromSession()` in `auth-helpers-clerk.ts`
3. Update `provider-context-guards.ts`
4. Update `auth-redirect.ts`
5. Update booking actions and webhooks
6. Update frontend components
7. Comprehensive testing

---

## 🔑 Key Concepts

### **Role Hierarchy:**
```
SUPERADMIN (system-wide access)
  └─ OWNER (full provider access)
      └─ STAFF (limited provider access)
```

### **Permission Model:**
```
User ─┬─> UserProviderRole ──> Role ──> RolePermission ──> Permission
      └─> UserProviderPermission ──────────────────────────> Permission
```

### **Access Check Flow:**
```
1. Check if user has UserProvider record for this providerId
2. Get all roles from UserProviderRole
3. Get all permissions from roles (RolePermission)
4. Get all direct permissions from UserProviderPermission
5. Combine and check if requested permission exists
```

---

## 🎯 Benefits Achieved

1. **Flexibility** - Users can have different roles in different businesses
2. **Granular Control** - Permission-level access control
3. **Exception Handling** - Direct permissions for special cases
4. **Scalability** - Easy to add new roles and permissions
5. **Security** - Centralized permission checking with `hasPermission()`
6. **Multi-tenancy** - Full support for users in multiple businesses

---

## 📝 Notes & Decisions

1. **Admin Seeding** - Only seeds admin user for security (no test data in production)
2. **Migration Strategy** - Gradual migration with backward compatibility
3. **Type Safety** - All new code uses TypeScript interfaces
4. **Permission Format** - `resource:action` (e.g., `booking:create`, `manage:settings`)
5. **Role Scope** - All roles are scoped to a provider (even SUPERADMIN is checked via UserProvider)

---

## 🐛 Issues Resolved

1. ✅ Fixed implicit 'any' type errors in `hasPermission()`
2. ✅ Added proper type annotations for arrow functions
3. ✅ Removed dependency on `StaffRole` enum
4. ✅ Updated seed script to avoid Prisma Client errors (old seed.ts had issues)
5. ✅ Configured prisma.config.ts for seed command (was missing)

---

## 💡 Lessons Learned

1. Always run `npx prisma generate` after schema changes
2. Create migration documents before starting large refactors
3. Maintain backward compatibility during gradual migrations
4. Use type guards for discriminated unions (`'userProvider' in context`)
5. Keep seed data in environment variables for security

---

## 🚀 Ready for Next Phase

**Current Position:** Type definitions complete, ready to update remaining helper functions and API routes.

**Next Action:** Complete the helper function updates in the identified 7 files.

---

*Last Updated: 2026-02-15T19:41:00+01:00*
