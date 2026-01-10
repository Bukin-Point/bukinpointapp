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
