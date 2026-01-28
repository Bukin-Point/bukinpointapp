# BukinPoint Architecture

## Overview

BukinPoint is a modern booking platform built with Next.js 16, featuring multi-tenant architecture supporting providers, staff members, and customers. The system enables businesses to manage services, staff, availability, and bookings while providing customers with a seamless booking experience.

## Tech Stack

### Core Framework
- **Next.js 16** - App Router with React 19
- **TypeScript** - Type-safe development
- **Server Actions** - Server-side mutations and queries

### Database & ORM
- **Neon** - Serverless PostgreSQL database
- **Prisma 7** - ORM with adapter-based client (`@prisma/adapter-pg`)
- **PostgreSQL** - Relational database

### Authentication
- **Better Auth** - Authentication framework
- **Session Management** - Server-side session handling
- **Role-Based Access Control** - Provider, Staff, Customer roles

### State Management
- **Zustand** - Client-side state management (if needed)
- **Server Components** - Primary data fetching pattern

### Caching & Performance
- **Redis** - Slot locking for concurrent booking prevention
- **Upstash** - Serverless Redis (recommended)

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Lucide React** - Icon library

### Validation & Utilities
- **Zod** - Schema validation
- **date-fns** - Date manipulation utilities

### Email
- **Resend** - Email delivery service

### Testing
- **Vitest** - Unit and integration testing
- **Test-Driven Development (TDD)** - Development methodology

## System Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Next.js App   │
│  (App Router)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
┌───▼───┐ ┌─▼────┐
│ Prisma│ │Redis │
│  ORM  │ │Cache │
└───┬───┘ └──────┘
    │
┌───▼──────────┐
│  PostgreSQL  │
│   (Neon)     │
└──────────────┘
```

### Application Layers

1. **Presentation Layer** - React components, pages, UI
2. **Application Layer** - Server actions, route handlers
3. **Business Logic Layer** - Helpers, utilities, validations
4. **Data Access Layer** - Prisma ORM, database queries
5. **Infrastructure Layer** - Database, Redis, Email service

## Database Schema Overview

### Core Models

- **User** - Authentication and user accounts
- **Provider** - Business owners
- **StaffMember** - Staff members with roles (STAFF, OWNER)
- **Service** - Services offered by providers
- **Booking** - Customer bookings
- **Availability** - Staff availability schedules
- **Transaction** - Payment transactions
- **Wallet** - Provider earnings wallet
- **StaffInvitation** - Staff invitation tokens

See [Database Schema](./technical/database-schema.md) for complete details.

## Authentication Architecture

### User Types

1. **Provider** - Business owner with full access
2. **Staff** - Staff member with role-based permissions
   - **OWNER** - Full access like provider
   - **STAFF** - Limited access (own bookings, availability)
3. **Customer** - End users making bookings

### Authentication Flow

```
User Signup/Signin
    │
    ├─► Provider → Create Provider Profile → Onboarding
    ├─► Staff → Accept Invitation → Link to Provider
    └─► Customer → Create Account → Customer Dashboard
```

### Session Management

- Server-side sessions via Better Auth
- Session stored in database
- Automatic role detection on signin
- Role-based redirects after authentication

See [Authentication Flow](./flows/authentication-flow.md) for details.

## Access Control

### Hybrid Staff Access

Staff members access provider routes via their `staffMember.providerId` relationship, allowing them to:
- View provider dashboard
- Manage their own bookings
- Set their availability
- Access provider services (read-only for STAFF role)

### Permission Matrix

| Feature | Provider | Staff (OWNER) | Staff (STAFF) | Customer |
|---------|----------|---------------|---------------|----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ (Customer) |
| Services | ✅ Full | ✅ Full | ✅ Read-only | ❌ |
| Bookings | ✅ All | ✅ All | ✅ Own only | ✅ Own only |
| Staff Management | ✅ | ✅ | ❌ | ❌ |
| Availability | ✅ All | ✅ All | ✅ Own only | ❌ |
| Wallet | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ✅ (Profile) |

See [Permissions](./technical/permissions.md) for complete access control details.

## File Structure

```
bukinpoint/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth routes
│   │   ├── (provider)/        # Provider routes (staff can access)
│   │   ├── (customer)/        # Customer routes
│   │   ├── book/               # Public booking pages
│   │   └── api/                # API routes
│   ├── components/            # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── provider/           # Provider components
│   │   ├── booking/            # Booking flow components
│   │   └── customer/           # Customer components
│   ├── lib/                    # Utilities and configs
│   │   ├── auth.ts             # Better Auth config
│   │   ├── auth-helpers.ts     # Auth utilities
│   │   ├── staff-helpers.ts    # Staff access utilities
│   │   ├── db.ts               # Prisma client
│   │   └── validations.ts      # Zod schemas
│   ├── actions/                # Server actions
│   │   ├── bookings.ts         # Booking actions
│   │   ├── services.ts         # Service actions
│   │   ├── staff.ts            # Staff actions
│   │   └── ...
│   └── stores/                 # Zustand stores (if needed)
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/            # Database migrations
├── docs/                       # Documentation
└── __tests__/                  # Test files
```

## Key Design Patterns

### Server Actions Pattern

All mutations use Next.js Server Actions:
- Type-safe with Zod validation
- Server-side execution
- Automatic error handling
- No API routes needed for mutations

### Hybrid Staff Access

Staff members access provider functionality through:
- `getProviderAccess()` - Gets provider context via staff membership
- Permission checks via `canManageStaff()`, `canEditServices()`, etc.
- Data filtering based on role

### Slot Locking

Redis-based locking prevents concurrent bookings:
- Lock key: `booking:${providerId}:${date}:${time}`
- TTL: 5 minutes (configurable)
- Automatic cleanup on expiration

### Decimal Serialization

Prisma Decimal fields converted to numbers for client components:
- Server components convert before passing to client
- Prevents serialization errors
- Maintains precision in database

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth secret (min 32 chars)
- `BETTER_AUTH_URL` - App URL for auth callbacks
- `NEXT_PUBLIC_APP_URL` - Public app URL

### Optional
- `REDIS_URL` - Redis connection (for slot locking)
- `RESEND_API_KEY` - Email service API key
- `RESEND_FROM_EMAIL` - Email sender address
- `PLATFORM_FEE_PERCENTAGE` - Platform fee (default: 10)
- `SLOT_LOCK_TTL` - Lock duration in seconds (default: 300)

## Security Considerations

1. **Authentication** - Server-side session validation
2. **Authorization** - Role-based access control
3. **Input Validation** - Zod schemas for all inputs
4. **SQL Injection** - Prisma ORM prevents SQL injection
5. **XSS Protection** - React's built-in XSS protection
6. **CSRF Protection** - Next.js built-in CSRF protection

## Performance Optimizations

1. **Server Components** - Reduce client bundle size
2. **Database Indexing** - Optimized queries with indexes
3. **Redis Caching** - Slot locking reduces database load
4. **Code Splitting** - Automatic with Next.js App Router
5. **Image Optimization** - Next.js Image component

## Scalability

- **Serverless Database** - Neon scales automatically
- **Serverless Redis** - Upstash scales automatically
- **Stateless Sessions** - Easy horizontal scaling
- **Database Indexes** - Optimized for query performance

## Changelog

- **2025-01-10** - Initial architecture documentation
- **2025-01-10** - Added hybrid staff access pattern
- **2025-01-10** - Documented permission matrix
