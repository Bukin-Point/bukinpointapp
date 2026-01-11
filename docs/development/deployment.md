# Deployment

## Overview

Guide for deploying BukinPoint to production.

## Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)
- Resend account (for emails)
- Domain name (for production)

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BETTER_AUTH_SECRET=min-32-characters-secret
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Optional
```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=BukinPoint <noreply@yourdomain.com>
PLATFORM_FEE_PERCENTAGE=10
SLOT_LOCK_TTL=300
```

## Database Setup

1. Create PostgreSQL database (Neon recommended)
2. Get connection string
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

## Redis Setup

1. Create Redis instance (Upstash recommended)
2. Get connection string
3. Configure in environment variables

## Email Setup

1. Create Resend account
2. Verify domain (for production)
3. Get API key
4. Configure in environment variables

## Build Process

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build application:
   ```bash
   npm run build
   ```

3. Start production server:
   ```bash
   npm start
   ```

## Deployment Platforms

### Vercel (Recommended)
1. Connect repository
2. Configure environment variables
3. Deploy automatically on push

### Other Platforms
- Follow platform-specific Next.js deployment guides
- Ensure Node.js 20+ support
- Configure environment variables
- Set up database and Redis

## Post-Deployment

1. Verify database migrations ran
2. Test authentication
3. Test booking flow
4. Verify email sending
5. Monitor error logs

## Related Documentation

- [Environment Setup](../../ENV_SETUP.md) - Environment variables
- [Setup Guide](../../SETUP_GUIDE.md) - Detailed setup

## Changelog

- **2025-01-10** - Initial deployment documentation
