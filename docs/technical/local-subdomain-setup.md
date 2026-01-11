# Local Subdomain Development Setup

This document explains how to set up local subdomain development for BukinPoint using DNSMasq and `.local` domains.

## Overview

To test subdomain functionality locally (e.g., `thank-god.bukinpoint.local:3000`), we use:
- **DNSMasq**: Resolves all `*.bukinpoint.local` subdomains to `127.0.0.1`
- **Better Auth cookie domain**: Configured to share cookies across subdomains
- **Next.js middleware**: Handles subdomain routing

## Quick Setup

### Automated Setup (Recommended)

Run the setup script:

```bash
./scripts/setup-dnsmasq.sh
```

This will:
1. Install DNSMasq (if not already installed)
2. Configure DNSMasq for `*.bukinpoint.local`
3. Set up system resolver
4. Start DNSMasq service
5. Test the configuration

### Manual Setup

See [DNSMASQ_SETUP.md](../../DNSMASQ_SETUP.md) for detailed manual setup instructions.

## Configuration

### Environment Variables

After DNSMasq setup, update your `.env` file:

```env
# Use .local domain for subdomain support
BETTER_AUTH_URL=http://bukinpoint.local:3000
NEXT_PUBLIC_APP_URL=http://bukinpoint.local:3000
```

### Better Auth Configuration

The Better Auth configuration in `src/lib/auth.ts` is set up to:
- Use `.bukinpoint.local` as cookie domain in development
- Use `.bukinpoint.com` as cookie domain in production
- Configure trusted origins for CORS

This allows session cookies to be shared across all subdomains.

### Middleware Configuration

The middleware in `src/middleware.ts`:
- Detects `.local` domains
- Extracts subdomain from hostname
- Queries database for provider by subdomain
- Rewrites/redirects requests appropriately

## Testing

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test Main Domain

Visit: `http://bukinpoint.local:3000`

You should see your application.

### 3. Test Subdomain

Visit: `http://thank-god.bukinpoint.local:3000` (replace with your provider's subdomain)

You should:
- See the booking page (if valid provider subdomain)
- Be able to sign in
- Stay signed in when navigating between subdomains

### 4. Test Authentication Across Subdomains

1. Sign in at `http://bukinpoint.local:3000`
2. Navigate to `http://thank-god.bukinpoint.local:3000/dashboard`
3. You should remain signed in (cookies are shared)

## Troubleshooting

### DNSMasq Not Working

1. Check if DNSMasq is running:
   ```bash
   # macOS
   brew services list | grep dnsmasq
   
   # Linux
   sudo systemctl status dnsmasq
   ```

2. Test DNS resolution:
   ```bash
   dig test.bukinpoint.local @127.0.0.1
   ```

3. Clear DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

### Cookies Not Working

1. Check browser DevTools → Application → Cookies
2. Verify cookies have domain `.bukinpoint.local`
3. Verify `.env` has correct `BETTER_AUTH_URL`

### Middleware Not Processing Subdomains

1. Check middleware logs in terminal
2. Verify subdomain exists in database
3. Check `x-provider-id` header in network tab

## Architecture

### Cookie Sharing

```
┌─────────────────────────────────────────┐
│  Better Auth Cookie Domain              │
│  .bukinpoint.local                      │
└─────────────────────────────────────────┘
              │
              ├─── bukinpoint.local:3000
              ├─── thank-god.bukinpoint.local:3000
              └─── any-subdomain.bukinpoint.local:3000
```

All subdomains share the same cookie domain, allowing session persistence.

### Request Flow

```
1. Browser: http://thank-god.bukinpoint.local:3000/dashboard
   ↓
2. DNSMasq: Resolves to 127.0.0.1
   ↓
3. Next.js Middleware: Extracts "thank-god" subdomain
   ↓
4. API Route: /api/subdomain-lookup?subdomain=thank-god
   ↓
5. Database: Find provider with subdomain="thank-god"
   ↓
6. Middleware: Adds x-provider-id header
   ↓
7. App Router: Processes request with provider context
```

## Production

In production, the same setup works with:
- Real DNS (wildcard subdomain configured in Vercel)
- `.bukinpoint.com` cookie domain
- HTTPS certificates for all subdomains

See [VERCEL_SUBDOMAIN_SETUP.md](../../VERCEL_SUBDOMAIN_SETUP.md) for production setup.

## References

- [DNSMasq Setup Guide](../../DNSMASQ_SETUP.md)
- [Vercel Subdomain Setup](../../VERCEL_SUBDOMAIN_SETUP.md)
- [Better Auth Documentation](https://www.better-auth.com/docs)
