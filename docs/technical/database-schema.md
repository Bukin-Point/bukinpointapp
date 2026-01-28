# Database Schema

## Overview

Complete documentation of the BukinPoint database schema, including all models, relationships, indexes, and constraints.

## Schema Location

- **File**: `prisma/schema.prisma`
- **ORM**: Prisma 7
- **Database**: PostgreSQL (Neon)

## Models

### User
Base user account for authentication.

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  emailVerified Boolean  @default(false)
  name          String?
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  provider         Provider?
  staffMemberships StaffMember[]
  sessions         Session[]
  accounts         Account[]
  bookings         Booking[]
}
```

**Relationships**:
- One-to-one with Provider
- One-to-many with StaffMember
- One-to-many with Session
- One-to-many with Account
- One-to-many with Booking

### Provider
Business owner profile.

```prisma
model Provider {
  id           String         @id @default(cuid())
  userId       String         @unique
  businessName String
  industry     String
  address      String?
  phone        String
  email        String
  timezone     String         @default("Africa/Lagos")
  status       ProviderStatus @default(ACTIVE)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  user         User           @relation(...)
  services     Service[]
  staff        StaffMember[]
  bookings     Booking[]
  availability Availability[]
  wallet       Wallet?
  invitations  StaffInvitation[]
}
```

**Enums**: `ProviderStatus` (ACTIVE, SUSPENDED, INACTIVE)

### Service
Services offered by providers.

```prisma
model Service {
  id          String   @id @default(cuid())
  providerId  String
  name        String
  description String?
  duration    Int      // minutes
  price       Decimal  @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  provider      Provider       @relation(...)
  bookings      Booking[]
  staffServices StaffService[]
}
```

### StaffMember
Staff members linked to providers.

```prisma
model StaffMember {
  id         String    @id @default(cuid())
  providerId String
  userId     String
  role       StaffRole @default(STAFF)
  isActive   Boolean   @default(true)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  provider     Provider       @relation(...)
  user         User           @relation(...)
  services     StaffService[]
  availability Availability[]
  bookings     Booking[]
}
```

**Enums**: `StaffRole` (OWNER, STAFF)

### StaffInvitation
Staff invitation tokens.

```prisma
model StaffInvitation {
  id         String    @id @default(cuid())
  providerId String
  email      String
  token      String    @unique
  role       StaffRole @default(STAFF)
  serviceIds String    @default("[]") // JSON array
  expiresAt  DateTime
  acceptedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  provider Provider @relation(...)
}
```

### Booking
Customer bookings.

```prisma
model Booking {
  id            String        @id @default(cuid())
  bookingRef    String        @unique @default(cuid())
  providerId    String
  serviceId     String
  staffId       String
  userId        String?       // Optional: customer account
  customerName  String
  customerPhone String
  customerEmail String?
  bookingDate   DateTime
  startTime     String        // "10:00"
  endTime       String        // "11:00"
  status        BookingStatus @default(PENDING)
  paymentStatus PaymentStatus @default(PENDING)
  paymentRef    String?
  consentGiven  Boolean       @default(false)
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  provider    Provider     @relation(...)
  service     Service      @relation(...)
  staff       StaffMember  @relation(...)
  user        User?        @relation(...)
  transaction Transaction?
}
```

**Enums**: 
- `BookingStatus` (PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
- `PaymentStatus` (PENDING, PAID, FAILED, REFUNDED)

### Availability
Staff availability schedules.

```prisma
model Availability {
  id          String    @id @default(cuid())
  providerId  String
  staffId     String
  dayOfWeek   Int       // 0-6 (Sunday-Saturday)
  startTime   String    // "09:00"
  endTime     String    // "17:00"
  isBlocked   Boolean   @default(false)
  blockedDate DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  provider Provider    @relation(...)
  staff    StaffMember @relation(...)
}
```

### Transaction
Payment transactions.

```prisma
model Transaction {
  id              String        @id @default(cuid())
  bookingId       String        @unique
  amount          Decimal       @db.Decimal(10, 2)
  platformFee     Decimal       @db.Decimal(10, 2)
  netAmount       Decimal       @db.Decimal(10, 2)
  paymentProvider String        @default("SIMULATED")
  providerRef     String?
  status          PaymentStatus @default(PENDING)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  booking Booking @relation(...)
}
```

### Wallet
Provider earnings wallet.

```prisma
model Wallet {
  id             String    @id @default(cuid())
  providerId     String    @unique
  balance        Decimal   @db.Decimal(10, 2) @default(0)
  totalEarnings  Decimal   @db.Decimal(10, 2) @default(0)
  lastSettlement DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  provider Provider @relation(...)
}
```

## Indexes

### User
- `email` (unique)

### Provider
- `status`
- `userId` (unique)

### Service
- `providerId, isActive`

### StaffMember
- `providerId, userId` (unique)
- `providerId, isActive`

### Booking
- `providerId, bookingDate, status`
- `staffId, bookingDate`
- `bookingRef` (unique)
- `customerPhone`
- `userId`

### Availability
- `providerId, staffId, dayOfWeek`
- `staffId, blockedDate`

### Transaction
- `status, createdAt`

## Relationships Summary

- **User** ↔ **Provider**: One-to-one
- **User** ↔ **StaffMember**: One-to-many
- **Provider** ↔ **Service**: One-to-many
- **Provider** ↔ **StaffMember**: One-to-many
- **Provider** ↔ **Booking**: One-to-many
- **Service** ↔ **Booking**: One-to-many
- **StaffMember** ↔ **Booking**: One-to-many
- **Booking** ↔ **Transaction**: One-to-one
- **Provider** ↔ **Wallet**: One-to-one

## Related Documentation

- [Architecture](../ARCHITECTURE.md) - System design
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate) - Migration history

## Changelog

- **2025-01-10** - Initial database schema documentation
