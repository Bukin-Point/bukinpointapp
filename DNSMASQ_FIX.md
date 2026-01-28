# Fix: macOS mDNS Conflict with .local Domains

## Problem

On macOS, `.local` domains are reserved for mDNS (Multicast DNS) and are handled by `mDNSResponder` before DNSMasq. This causes `bukinpoint.local` queries to fail because mDNSResponder doesn't know about our custom domains.

## Solution: Use `.test` Domain Instead

The `.test` TLD is reserved for testing and won't conflict with mDNS. We'll switch from `.local` to `.test`.

## Quick Fix Steps

### 1. Update DNSMasq Configuration

```bash
# Add .test domain to DNSMasq config
echo "address=/.bukinpoint.test/127.0.0.1" | sudo tee -a $(brew --prefix)/etc/dnsmasq.conf

# Restart DNSMasq
sudo brew services restart dnsmasq
```

### 2. Create Resolver Configuration

```bash
# Create resolver file for .test domain
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/bukinpoint.test
```

### 3. Flush DNS Cache

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### 4. Test DNS Resolution

```bash
# Should return 127.0.0.1
dig bukinpoint.test +short

# Should also return 127.0.0.1
dig thank-god.bukinpoint.test +short
```

### 5. Update Environment Variables

Update your `.env` file:

```env
BETTER_AUTH_URL=http://bukinpoint.test:3000
NEXT_PUBLIC_APP_URL=http://bukinpoint.test:3000
```

### 6. Restart Development Server

```bash
npm run dev
```

### 7. Test in Browser

- Main domain: `http://bukinpoint.test:3000`
- Subdomain: `http://thank-god.bukinpoint.test:3000`

## Why .test Instead of .local?

- ✅ `.test` is reserved for testing (RFC 2606)
- ✅ No conflicts with mDNS on macOS
- ✅ Works with DNSMasq without special configuration
- ✅ Browsers handle it correctly
- ✅ Same functionality as `.local` for development

## Verification

After setup, verify everything works:

1. **DNS Resolution:**
   ```bash
   dig bukinpoint.test +short
   # Should output: 127.0.0.1
   ```

2. **Browser Access:**
   - Open `http://bukinpoint.test:3000`
   - Should load your application

3. **Subdomain Access:**
   - Open `http://thank-god.bukinpoint.test:3000`
   - Should load the booking page (if provider exists)

4. **Cookie Sharing:**
   - Sign in at `http://bukinpoint.test:3000`
   - Navigate to `http://thank-god.bukinpoint.test:3000/dashboard`
   - Should remain signed in

## Troubleshooting

If `dig` still doesn't work:

1. **Check DNSMasq is running:**
   ```bash
   brew services list | grep dnsmasq
   ```

2. **Check DNSMasq config:**
   ```bash
   cat $(brew --prefix)/etc/dnsmasq.conf | grep bukinpoint.test
   ```

3. **Test directly with DNSMasq:**
   ```bash
   dig bukinpoint.test @127.0.0.1 +short
   # Should return 127.0.0.1
   ```

4. **Check resolver file:**
   ```bash
   cat /etc/resolver/bukinpoint.test
   # Should show: nameserver 127.0.0.1
   ```

If direct query works but system query doesn't, restart your browser and flush DNS cache again.
