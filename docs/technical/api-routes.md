# API Routes

## Overview

BukinPoint primarily uses Server Actions for mutations. API routes are minimal and mainly used for Better Auth.

## Authentication Routes

### `/api/auth/[...all]`
Better Auth catch-all route for authentication.

**File**: `src/app/api/auth/[...all]/route.ts`

**Handles**:
- Signin
- Signup
- Signout
- Session management
- OAuth (if configured)

**Configuration**: `src/lib/auth.ts`

## Future API Routes

Potential future API routes:
- Webhook endpoints (payment providers)
- Public API (if needed)
- Admin endpoints (if needed)

## Related Documentation

- [Authentication](../features/authentication.md) - Auth system
- [Server Actions](./server-actions.md) - Primary mutation pattern

## Changelog

- **2025-01-10** - Initial API routes documentation
