# Environment Variables Setup Guide

## Quick Reference

### NEXT_PUBLIC_APP_URL

**What it is:**
The public-facing URL of your application. This is used by the client-side code to make API calls and generate absolute URLs.

**Where to get it:**

1. **Local Development:**
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   - This is your local development server URL
   - Default Next.js port is 3000
   - If you change the port, update accordingly (e.g., `http://localhost:3001`)

2. **Production (Vercel):**
   ```env
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
   - Vercel automatically provides this
   - Check your Vercel project settings → Environment Variables
   - Or use your custom domain if configured

3. **Production (Other Platforms):**
   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```
   - Use your actual domain name
   - Must include protocol (http:// or https://)
   - No trailing slash

4. **Staging/Preview:**
   ```env
   NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com
   ```
   - Use your staging environment URL

**How to verify it's working:**
- Check browser console for API calls - they should use this URL
- Public booking links should use this URL
- OAuth redirects (if enabled) will use this URL

---

## Complete .env Example

```env
# Database (Neon or PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/bukinpoint?sslmode=require"

# Redis (Upstash or self-hosted)
REDIS_URL="redis://default:password@host:port"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-minimum-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PLATFORM_FEE_PERCENTAGE="10"
SLOT_LOCK_TTL="300"
```

---

## Platform-Specific Setup

### Vercel

1. Go to your project → Settings → Environment Variables
2. Add each variable
3. For `NEXT_PUBLIC_APP_URL`, use:
   - Preview: `https://your-app-git-branch.vercel.app`
   - Production: `https://your-app.vercel.app` or your custom domain

### Netlify

1. Go to Site settings → Environment variables
2. Add each variable
3. For `NEXT_PUBLIC_APP_URL`, use your Netlify URL or custom domain

### Railway

1. Go to your project → Variables
2. Add each variable
3. For `NEXT_PUBLIC_APP_URL`, use your Railway-provided URL

### Self-Hosted

1. Set environment variables in your deployment configuration
2. For `NEXT_PUBLIC_APP_URL`, use your server's public IP or domain

---

## Important Notes

1. **NEXT_PUBLIC_ prefix**: Variables starting with `NEXT_PUBLIC_` are exposed to the browser. Don't put secrets here!

2. **BETTER_AUTH_SECRET**: Generate a secure random string:
   ```bash
   openssl rand -base64 32
   ```

3. **BETTER_AUTH_URL vs NEXT_PUBLIC_APP_URL**:
   - `BETTER_AUTH_URL`: Used by server-side auth (can be same as NEXT_PUBLIC_APP_URL)
   - `NEXT_PUBLIC_APP_URL`: Used by client-side code

4. **Development vs Production**: Use different values for each environment

5. **Never commit .env files**: They're in `.gitignore` for a reason!
