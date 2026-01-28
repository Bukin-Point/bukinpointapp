import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export async function lockSlot(key: string, ttl: number = 300): Promise<boolean> {
  try {
    const result = await redis.set(key, 'locked', 'EX', ttl, 'NX')
    return result === 'OK'
  } catch (error) {
    console.error('Error locking slot:', error)
    return false
  }
}

export async function releaseSlot(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Error releasing slot:', error)
  }
}

export async function isSlotLocked(key: string): Promise<boolean> {
  try {
    const result = await redis.exists(key)
    return result === 1
  } catch (error) {
    console.error('Error checking slot lock:', error)
    return false
  }
}

// Cache helper functions for time slots
export async function getCachedSlots(key: string): Promise<any[] | null> {
  try {
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
    return null
  } catch (error) {
    console.error('Error getting cached slots:', error)
    return null
  }
}

export async function setCachedSlots(key: string, slots: any[], ttl: number = 600): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(slots))
  } catch (error) {
    console.error('Error setting cached slots:', error)
  }
}

export async function invalidateSlotCache(providerId: string, serviceId?: string, date?: string): Promise<void> {
  try {
    if (serviceId && date) {
      // Invalidate specific cache
      const key = `slots:${providerId}:${serviceId}:${date}`
      await redis.del(key)
    } else if (serviceId) {
      // Invalidate all caches for this service
      const pattern = `slots:${providerId}:${serviceId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } else {
      // Invalidate all caches for this provider
      const pattern = `slots:${providerId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  } catch (error) {
    console.error('Error invalidating slot cache:', error)
  }
}
