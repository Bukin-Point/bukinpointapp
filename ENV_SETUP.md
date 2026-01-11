# Environment Variables Setup Guide

## Quick Reference

### NEXT_PUBLIC_APP_URL

**What it is:**
The public-facing URL of your application. This is used by the client-side code to make API calls and generate absolute URLs.

**Where to get it:**

1. **Local Development (with DNSMasq for subdomains):**
   ```env
   NEXT_PUBLIC_APP_URL=http://bukinpoint.local:3000
   BETTER_AUTH_URL=http://bukinpoint.local:3000
   ```
   - Use `.local` domain for subdomain support (requires DNSMasq setup)
   - See `DNSMASQ_SETUP.md` for configuration instructions
   - Enables cookie sharing across subdomains (e.g., `thank-god.bukinpoint.local:3000`)

2. **Local Development (without subdomains):**
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   BETTER_AUTH_URL=http://localhost:3000
   ```
   - Standard localhost setup
   - Subdomain routing will not work (middleware skips localhost)
   - Use this if you don't need to test subdomains locally

3. **Production (Vercel):**
   ```env
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```
   - Vercel automatically provides this
   - Check your Vercel project settings → Environment Variables
   - Or use your custom domain if configured

4. **Production (Other Platforms):**
   ```env
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```
   - Use your actual domain name
   - Must include protocol (http:// or https://)
   - No trailing slash

5. **Staging/Preview:**
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
BETTER_AUTH_URL="http://localhost:3000"  # Development: http://bukinpoint.test:3000 | Production: https://bukinpoint.com

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Development: http://bukinpoint.test:3000 | Production: https://bukinpoint.com
PLATFORM_FEE_PERCENTAGE="10"
SLOT_LOCK_TTL="300"

# Production Domain Configuration (for subdomain redirects)
# Only needed if using subdomain redirects after authentication
# ALLOWED_REDIRECT_DOMAINS="bukinpoint.com"  # Optional: Explicit whitelist for redirect validation

# Email Service (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="BukinPoint <onboarding@resend.dev>"  # Optional: Use verified domain in production
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

---

## Email Service (Resend)

### RESEND_API_KEY

**What it is:**
API key for Resend email service, used to send staff invitation emails.

**Where to get it:**
1. Sign up at https://resend.com
2. Go to API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)

**Development:**
```env
RESEND_API_KEY="re_xxxxxxxxxxxxx"
```

**Production:**
- Use the same API key
- **Important**: You must verify a domain in Resend dashboard for production
- Update `RESEND_FROM_EMAIL` to use your verified domain

### RESEND_FROM_EMAIL (Optional)

**What it is:**
The "from" email address for sent emails. Defaults to `BukinPoint <onboarding@resend.dev>` if not set.

**Development:**
```env
RESEND_FROM_EMAIL="BukinPoint <onboarding@resend.dev>"
```

**Production:**
```env
RESEND_FROM_EMAIL="BukinPoint <noreply@yourdomain.com>"
```
- Must use a verified domain in Resend
- Format: `Display Name <email@domain.com>`

**How to verify domain:**
1. Go to Resend dashboard → Domains
2. Add your domain
3. Add DNS records as instructed
4. Wait for verification (usually a few minutes)
