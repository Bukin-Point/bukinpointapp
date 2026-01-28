# Redis Integration

## Overview

Redis is used for slot locking to prevent concurrent bookings for the same time slot. This ensures data consistency and prevents double-booking.

## Purpose

When multiple customers attempt to book the same time slot simultaneously, Redis locks prevent race conditions and ensure only one booking succeeds.

## Implementation

### Configuration

**File**: `src/lib/redis.ts`

**Environment Variable**: `REDIS_URL`

**Service**: Upstash (recommended) or self-hosted Redis

### Lock Key Format

```
booking:{providerId}:{date}:{time}
```

**Example**: `booking:clx123abc:2025-01-15:10:00`

### Lock Duration

- **Default TTL**: 5 minutes (300 seconds)
- **Configurable**: Via `SLOT_LOCK_TTL` environment variable
- **Purpose**: Allows customer time to complete booking form

### Lock Operations

#### Acquire Lock
```typescript
await redis.set(lockKey, 'locked', { ex: TTL })
```

#### Release Lock
```typescript
await redis.del(lockKey)
```

#### Check Lock
```typescript
const exists = await redis.exists(lockKey)
```

## Booking Flow Integration

### Step 1: Lock Acquisition
1. Customer selects time slot
2. System generates lock key
3. System attempts to acquire lock
4. If successful, proceed to booking form
5. If failed, show "Slot no longer available"

### Step 2: Lock Release
1. Booking created successfully → Release lock
2. Booking fails → Release lock
3. Lock expires → Automatic release (after TTL)

## Edge Cases

### Lock Expiration
- **Scenario**: Customer takes >5 minutes to complete form
- **Behavior**: Lock expires, slot becomes available
- **Result**: Customer must select new time slot if original is taken

### Concurrent Requests
- **Scenario**: Two customers select same slot simultaneously
- **Behavior**: First request acquires lock, second fails
- **Result**: Only first booking succeeds

### Lock Not Released
- **Scenario**: Booking creation fails after lock acquisition
- **Behavior**: Lock expires automatically (TTL)
- **Recovery**: No manual intervention needed

## Configuration

### Environment Variables

```env
REDIS_URL=redis://...
SLOT_LOCK_TTL=300  # Optional, default: 300 seconds
```

### Development
- Use Upstash free tier for development
- Or run local Redis instance

### Production
- Use Upstash or managed Redis service
- Configure appropriate TTL based on booking flow duration

## Related Documentation

- [Booking Flow](../flows/booking-flow.md) - Slot locking in booking process
- [Bookings Feature](../features/bookings.md) - Booking system

## Changelog

- **2025-01-10** - Initial Redis integration documentation
