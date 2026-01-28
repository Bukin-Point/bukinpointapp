# Vercel Subdomain Configuration Guide

This guide walks you through setting up wildcard subdomains in Vercel for BukinPoint.

## Prerequisites

- Vercel account with your project deployed
- Domain name (`bukinpoint.com`) registered and accessible
- Access to your domain registrar's DNS settings

## Step-by-Step Configuration

### Step 1: Add Primary Domain to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your primary domain: `bukinpoint.com`
5. Click **Add**
6. Vercel will provide DNS configuration instructions

### Step 2: Configure DNS at Domain Registrar

Vercel will show you DNS records to add. You'll need to add:

**Option A: Using A Record (Recommended)**
```
Type: A
Name: @ (or leave blank for root domain)
Value: [Vercel's IP address - shown in dashboard]
TTL: 3600 (or Auto)
```

**Option B: Using CNAME (Alternative)**
```
Type: CNAME
Name: @ (or leave blank for root domain)
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

**Note**: Some registrars don't allow CNAME on root domain. Use A record if CNAME isn't supported.

### Step 3: Add Wildcard Subdomain

1. In Vercel **Settings** → **Domains**
2. Click **Add Domain** again
3. Enter wildcard domain: `*.bukinpoint.com`
4. Click **Add**
5. Vercel will automatically handle all subdomains

### Step 4: Verify DNS Configuration

After adding DNS records, wait for DNS propagation (5 minutes to 48 hours):

1. Check DNS propagation using tools like:
   - `dig bukinpoint.com`
   - `nslookup bukinpoint.com`
   - Online tools: [whatsmydns.net](https://www.whatsmydns.net)

2. Verify in Vercel dashboard:
   - Both `bukinpoint.com` and `*.bukinpoint.com` should show as "Valid"
   - Status should be "Valid Configuration"

### Step 5: Test Subdomain Routing

1. Create a test provider account in your app
2. Note the generated subdomain (e.g., `migdala`)
3. Visit `https://migdala.bukinpoint.com` in your browser
4. Verify it routes to the provider's booking page

## Environment Variables

No additional environment variables needed. The app uses:
- `NEXT_PUBLIC_APP_URL` - Should be set to `https://bukinpoint.com` in production

## Troubleshooting

### Subdomain Not Working

1. **Check DNS Propagation**
   - Wait 24-48 hours for full propagation
   - Verify DNS records are correct at registrar

2. **Check Vercel Domain Status**
   - Go to Settings → Domains
   - Ensure both domains show "Valid Configuration"
   - Check for any error messages

3. **Check Middleware**
   - Verify `src/middleware.ts` is deployed
   - Check Vercel function logs for middleware errors

4. **Test with curl**
   ```bash
   curl -I https://migdala.bukinpoint.com
   ```
   Should return 200 status, not 404

### Common Issues

**Issue**: Subdomain shows Vercel 404 page
- **Solution**: Ensure wildcard domain `*.bukinpoint.com` is added in Vercel

**Issue**: DNS not resolving
- **Solution**: Double-check DNS records at registrar match Vercel's instructions

**Issue**: SSL certificate errors
- **Solution**: Vercel automatically provisions SSL for all domains. Wait a few minutes after adding domain.

**Issue**: Subdomain redirects to main domain
- **Solution**: Check middleware logs. Provider might not exist or subdomain not found in database.

## Verification Checklist

- [ ] Primary domain `bukinpoint.com` added to Vercel
- [ ] Wildcard domain `*.bukinpoint.com` added to Vercel
- [ ] DNS records configured at registrar
- [ ] DNS propagation complete (verified with dig/nslookup)
- [ ] Both domains show "Valid" in Vercel dashboard
- [ ] Test subdomain routes correctly (e.g., `migdala.bukinpoint.com`)
- [ ] SSL certificates active (HTTPS works)

## Production Deployment

After configuration:

1. Deploy your latest code to Vercel
2. Ensure middleware is included in deployment
3. Test with a real provider account
4. Monitor Vercel function logs for any middleware errors

## Additional Notes

- Vercel automatically handles SSL certificates for all domains
- Wildcard subdomains are free on Vercel
- No additional configuration needed in `next.config.ts`
- Middleware runs on Edge Network for fast routing
