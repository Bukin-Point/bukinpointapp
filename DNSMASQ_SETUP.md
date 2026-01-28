# DNSMasq Setup Guide for Local Subdomain Development

This guide helps you set up `dnsmasq` to enable wildcard subdomain support for local development with `.test` domains.

**Note:** We use `.test` instead of `.local` to avoid conflicts with macOS's mDNSResponder. See [DNSMASQ_FIX.md](./DNSMASQ_FIX.md) for details.

## Why DNSMasq?

- **Wildcard subdomain support**: Automatically resolves `*.bukinpoint.test` to `127.0.0.1`
- **No manual hosts file edits**: No need to add each subdomain manually
- **Works with Better Auth cookies**: Enables cookie sharing across subdomains

## Prerequisites

- macOS or Linux system
- Homebrew (macOS) or `apt`/`yum` (Linux)
- Administrator/sudo access

## Installation & Configuration

### macOS Setup

#### Step 1: Install DNSMasq

```bash
brew install dnsmasq
```

#### Step 2: Configure DNSMasq

Create or edit the DNSMasq configuration file:

```bash
mkdir -p $(brew --prefix)/etc/
echo 'address=/.bukinpoint.test/127.0.0.1' | sudo tee $(brew --prefix)/etc/dnsmasq.conf
```

This configuration tells DNSMasq to resolve all subdomains of `bukinpoint.test` to `127.0.0.1`.

#### Step 3: Start DNSMasq Service

```bash
sudo brew services start dnsmasq
```

#### Step 4: Configure macOS Resolver

Create a resolver configuration file so macOS uses DNSMasq for `.bukinpoint.test` domains:

```bash
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/bukinpoint.test
```

#### Step 5: Verify Installation

Test that DNSMasq is working:

```bash
# Test main domain
dig bukinpoint.test @127.0.0.1

# Test subdomain (should resolve to 127.0.0.1)
dig thank-god.bukinpoint.test @127.0.0.1
```

You should see `127.0.0.1` in the ANSWER SECTION.

### Linux (Ubuntu/Debian) Setup

#### Step 1: Install DNSMasq

```bash
sudo apt update
sudo apt install dnsmasq
```

#### Step 2: Configure DNSMasq

Edit the DNSMasq configuration file:

```bash
sudo nano /etc/dnsmasq.conf
```

Add the following line at the end:

```
address=/.bukinpoint.test/127.0.0.1
```

Save and exit (Ctrl+X, then Y, then Enter).

#### Step 3: Start DNSMasq Service

```bash
sudo systemctl start dnsmasq
sudo systemctl enable dnsmasq
```

#### Step 4: Configure System Resolver

Edit the systemd-resolved configuration:

```bash
sudo nano /etc/systemd/resolved.conf
```

Add or modify the following lines:

```
[Resolve]
DNS=127.0.0.1
Domains=~bukinpoint.test
```

Save and exit, then restart the service:

```bash
sudo systemctl restart systemd-resolved
```

#### Step 5: Verify Installation

Test that DNSMasq is working:

```bash
# Test main domain
dig bukinpoint.local @127.0.0.1

# Test subdomain
dig thank-god.bukinpoint.test @127.0.0.1
```

## Testing the Setup

### 1. Start Your Development Server

```bash
npm run dev
```

### 2. Test Main Domain

Open your browser and visit:
```
http://bukinpoint.test:3000
```

You should see your application.

### 3. Test Subdomain

Visit a subdomain (replace `thank-god` with your actual provider subdomain):
```
http://thank-god.bukinpoint.test:3000
```

You should:
- See the booking page (if it's a valid provider subdomain)
- Be able to sign in and stay signed in across subdomains
- Access the dashboard at `http://thank-god.bukinpoint.test:3000/dashboard`

### 4. Verify Cookie Sharing

1. Sign in at `http://bukinpoint.test:3000`
2. Navigate to `http://thank-god.bukinpoint.test:3000/dashboard`
3. You should remain signed in (cookies are shared across subdomains)

## Troubleshooting

### DNSMasq Not Resolving

**Check if DNSMasq is running:**
```bash
# macOS
brew services list | grep dnsmasq

# Linux
sudo systemctl status dnsmasq
```

**Check DNSMasq logs:**
```bash
# macOS
tail -f $(brew --prefix)/var/log/dnsmasq.log

# Linux
sudo journalctl -u dnsmasq -f
```

**Restart DNSMasq:**
```bash
# macOS
sudo brew services restart dnsmasq

# Linux
sudo systemctl restart dnsmasq
```

### Browser Not Resolving Subdomains

**Clear DNS cache:**
```bash
# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux
sudo systemd-resolve --flush-caches
```

**Test with `dig` directly:**
```bash
dig thank-god.bukinpoint.test @127.0.0.1
```

If this works but the browser doesn't, try:
- Restarting your browser
- Using a different browser
- Checking browser DNS settings

### Port Conflicts

If port 53 (DNS) is already in use:

```bash
# Check what's using port 53
sudo lsof -i :53

# DNSMasq can be configured to use a different port
# Edit the config file and add: port=5353
# Then update resolver to use 127.0.0.1:5353
```

### Better Auth Cookies Not Working

**Check cookie domain in browser DevTools:**
1. Open DevTools → Application → Cookies
2. Verify cookies have domain `.bukinpoint.test`
3. If not, check your `.env` file has correct `BETTER_AUTH_URL`

**Verify environment variables:**
```bash
# Should be set to:
BETTER_AUTH_URL=http://bukinpoint.test:3000
NEXT_PUBLIC_APP_URL=http://bukinpoint.test:3000
```

## Stopping DNSMasq

If you need to stop DNSMasq:

```bash
# macOS
sudo brew services stop dnsmasq

# Linux
sudo systemctl stop dnsmasq
```

## Additional Resources

- [DNSMasq Documentation](https://thekelleys.org.uk/dnsmasq/doc.html)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)

## Next Steps

After setting up DNSMasq:
1. Update your `.env` file with `.local` domain URLs
2. Restart your development server
3. Test subdomain functionality
4. Verify authentication works across subdomains
