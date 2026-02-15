# RBAC Migration - Comprehensive File List

## 🚨 CRITICAL ISSUE
The schema uses `userProvider` but there are **24+ files** still using `staff` relation in queries. This requires a systematic update across the entire codebase.

## 📋 Files Needing Updates

### **Actions (Server-Side Logic)**
1. `src/actions/dashboard.ts` - Lines 125, 161 ✅ PARTIALLY DONE (needs review)
2. `src/actions/customer.ts` - Lines 36, 80
3. `src/actions/bookings.ts` - ✅ DONE
4. `src/app/book/[providerId]/actions.ts` - Lines 12, 75, 113, 127, 358, 425, 444
5. `src/lib/payments/fulfill-payment.ts` - Line 16

### **Pages (Server Components)**
6. `src/app/page.tsx` - Lines 118, 144
7. `src/app/book/[providerId]/page.tsx` - Line 36
8. `src/app/book/[providerId]/confirm/page.tsx` - Line 53
9. `src/app/(provider)/services/page.tsx` - Line 58
10. `src/app/(provider)/bookings/page.tsx` - Lines 122, 198

### **Components (Client & Server)**
11. `src/components/provider/upcoming-appointments.tsx` - Line 14
12. `src/components/provider/reschedule-booking-modal.tsx` - Line 25
13. `src/components/provider/recent-bookings.tsx` - Line 16
14. `src/components/provider/booking-table.tsx` - Line 30
15. `src/components/provider/booking-list.tsx` - Lines 25, 151
16. `src/components/provider/booking-details-modal.tsx` - Line 23
17. `src/components/provider/booking-form-modal.tsx` - Line 232
18. `src/components/provider/availability-form.tsx` - Line 11
19. `src/components/provider/bulk-availability-form.tsx` - Line 14
20. `src/components/customer/reschedule-booking-modal.tsx` - Line 28
21. `src/components/customer/booking-list.tsx` - Line 33
22. `src/components/booking/booking-confirmation.tsx` - Line 16
23. `src/components/booking/booking-flow.tsx` - Line 124

### **Other Actions**
24. `src/actions/staff.ts` - Lines 66, 106, 113
25. `src/actions/staff-invitations.ts` - Line 309
26. `src/actions/services.ts` - Line 67

## 🔧 Required Changes

### Pattern 1: Query Includes
```typescript
// OLD
include: {
  staff: {
    include: {
      user: { select: { name: true } }
    }
  }
}

// NEW
include: {
  userProvider: {
    include: {
      user: { select: { name: true } }
    }
  }
}
```

### Pattern 2: Field References
```typescript
// OLD
staffId: validated.staffId

// NEW
userProviderId: validated.staffId  // Keep param name for now, map to new field
```

### Pattern 3: Type Definitions
```typescript
// OLD
type Booking = {
  staff: { user: { name: string } }
}

// NEW
type Booking = {
  userProvider: { user: { name: string } }
}
```

### Pattern 4: Accessing Data
```typescript
// OLD
booking.staff.user.name

// NEW
booking.userProvider.user.name
```

## 🎯 Recommended Approach

### Option 1: Bulk Find & Replace (Risky)
Use VS Code's find and replace with regex:
- Find: `staff: \{`
- Replace: `userProvider: {`
- Find: `\.staff\.`
- Replace: `.userProvider.`

**⚠️ WARNING**: This may break some legitimate uses of "staff" in comments or UI text.

### Option 2: File-by-File (Safer)
Update each file individually, testing as you go. Start with:
1. Actions (server-side logic)
2. Pages (server components)
3. Components (client components)

### Option 3: Gradual Migration (Recommended)
1. **Fix build-breaking files first** (the current error)
2. **Test core functionality** (auth, dashboard, bookings)
3. **Update remaining files** as you encounter them
4. **Add backwards compatibility** if needed

## 🔍 Finding the Current Build Error

The error shows line 36 with `staff: {`. To find it:
```powershell
# Search for files with "staff: {" around line 36
Get-ChildItem -Recurse -Include *.ts,*.tsx | Select-String "staff: \{" | Where-Object { $_.LineNumber -eq 36 }
```

## 📝 Next Steps

1. **Identify the file** causing the current build error (line 36)
2. **Fix that file** to unblock the build
3. **Create a systematic plan** for the remaining files
4. **Consider adding a migration script** to automate the updates

---

**Last Updated:** 2026-02-15T21:47:00+01:00
