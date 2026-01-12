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
RESEND_ONBOARDING_EMAIL="BukinPoint <onboarding@bukinpoint.com>"  # For staff invitations and onboarding
RESEND_BOOKINGS_EMAIL="BukinPoint <bookings@bukinpoint.com>"  # For booking confirmations and updates
RESEND_FROM_EMAIL="BukinPoint <onboarding@resend.dev>"  # Fallback if specific emails not set (development only)

# Image Storage (Cloudflare R2)
CLOUDFLARE_R2_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-access-key"
CLOUDFLARE_R2_BUCKET_NAME="bukinpoint-images"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"  # Or custom domain: https://images.yourdomain.com
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

### RESEND_ONBOARDING_EMAIL (Recommended)

**What it is:**
The "from" email address for onboarding-related emails (staff invitations, account setup, etc.).

**Development:**
```env
RESEND_ONBOARDING_EMAIL="BukinPoint <onboarding@resend.dev>"
```

**Production:**
```env
RESEND_ONBOARDING_EMAIL="BukinPoint <onboarding@bukinpoint.com>"
```
- Must use a verified domain in Resend
- Format: `Display Name <email@domain.com>`
- **Note**: You don't need to create an actual email inbox - just verify the domain in Resend

### RESEND_BOOKINGS_EMAIL (Recommended)

**What it is:**
The "from" email address for booking-related emails (confirmations, status updates, notifications).

**Development:**
```env
RESEND_BOOKINGS_EMAIL="BukinPoint <bookings@resend.dev>"
```

**Production:**
```env
RESEND_BOOKINGS_EMAIL="BukinPoint <bookings@bukinpoint.com>"
```
- Must use a verified domain in Resend
- Format: `Display Name <email@domain.com>`
- **Note**: You don't need to create an actual email inbox - just verify the domain in Resend

### RESEND_FROM_EMAIL (Fallback - Optional)

**What it is:**
Fallback "from" email address if specific email addresses are not set. Used for backward compatibility.

**Development:**
```env
RESEND_FROM_EMAIL="BukinPoint <onboarding@resend.dev>"
```

**Production:**
```env
RESEND_FROM_EMAIL="BukinPoint <noreply@yourdomain.com>"
```

**How to verify domain in Resend:**
1. Go to Resend dashboard → Domains
2. Add your domain (e.g., `bukinpoint.com`)
3. Add the DNS records as instructed (SPF, DKIM, DMARC)
4. Wait for verification (usually a few minutes)
5. Once verified, you can use ANY email address on that domain (e.g., `onboarding@bukinpoint.com`, `bookings@bukinpoint.com`, `noreply@bukinpoint.com`)
6. **Important**: You don't need to create actual email inboxes - Resend handles the sending, you just need the domain verified

---

## Image Storage (Cloudflare R2)

### Overview
BukinPoint uses Cloudflare R2 for image storage. R2 is S3-compatible object storage with automatic optimization and CDN delivery.

### Required Environment Variables

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-access-key"
CLOUDFLARE_R2_BUCKET_NAME="bukinpoint-images"
CLOUDFLARE_R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

### CLOUDFLARE_R2_ACCOUNT_ID

**What it is:**
Your Cloudflare account ID, used to construct the R2 endpoint URL.

**Where to get it:**
1. Log in to Cloudflare dashboard
2. Go to any page (e.g., Overview)
3. Your Account ID is displayed in the right sidebar
4. Copy the ID (format: 32-character alphanumeric string)

**Example:**
```env
CLOUDFLARE_R2_ACCOUNT_ID="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

### CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY

**What it is:**
R2 API token credentials (S3-compatible) for accessing your R2 bucket. These are different from regular Cloudflare API tokens and are specifically for R2/S3-compatible operations.

**Important:** You need **R2 API Tokens**, not regular Cloudflare API Tokens. Regular API tokens won't work with the S3 SDK.

**Where to get it:**

Follow the official [Cloudflare R2 API Tokens guide](https://developers.cloudflare.com/r2/api/tokens/):

1. **Navigate to R2 API Tokens:**
   - Go to Cloudflare Dashboard: https://dash.cloudflare.com/
   - Navigate to **R2 object storage** page: https://dash.cloudflare.com/?to=/:account/r2/overview
   - Click **"Manage API tokens"** button
   - ⚠️ **Critical**: This is in the R2 section, NOT "My Profile → API Tokens"
   - Regular Cloudflare API tokens won't work - you need R2-specific tokens

2. **Create R2 API Token:**
   - Choose token type:
     - **Create Account API token** (Recommended for production)
       - Tied to your Cloudflare account
       - Requires Super Administrator role
       - Remains valid until manually revoked
     - **Create User API token**
       - Tied to your individual user
       - Inherits your personal permissions
   - Under **Permissions**, select **"Object Read & Write"**
     - This allows reading, writing, and listing objects in buckets
   - (Optional) Scope to specific buckets for better security
   - Click **"Create Account API token"** or **"Create User API token"**

3. **Copy Your Credentials:**
   After creation, you'll receive **TWO separate values**:
   - **Access Key ID** (the token ID) → `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - **Secret Access Key** (SHA-256 hash of token value) → `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - ⚠️ **WARNING**: You will NOT be able to access the Secret Access Key again!
   - Save both values immediately to a secure location

**If you only see one "access token" value:**
- You created a regular Cloudflare API Token (from "My Profile → API Tokens")
- Delete it and create an R2 API Token from the R2 section instead
- R2 API Tokens provide Access Key ID + Secret Access Key pairs (S3-compatible)

**Example:**
```env
CLOUDFLARE_R2_ACCESS_KEY_ID="abc123def456ghi789"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="xyz789uvw456rst123abc456def789ghi012jkl345"
```

**Security Notes:**
- Never commit these keys to version control
- Rotate keys periodically
- Use different keys for development and production
- Restrict API token permissions to only what's needed

### CLOUDFLARE_R2_BUCKET_NAME

**What it is:**
The name of your R2 bucket where images will be stored.

**How to create:**
1. Go to Cloudflare Dashboard → R2
2. Click "Create bucket"
3. Enter a bucket name (e.g., `bukinpoint-images`)
4. Choose a location (closest to your users)
5. Click "Create bucket"

**Example:**
```env
CLOUDFLARE_R2_BUCKET_NAME="bukinpoint-images"
```

**Bucket Settings:**
- **Public Access**: Enable if you want direct public URLs
- **Custom Domain**: Optional - set up a custom domain for better branding
- **CORS**: Configure if needed for direct browser uploads (handled by presigned URLs)

### CLOUDFLARE_R2_PUBLIC_URL

**What it is:**
The public URL where your R2 bucket images are accessible. This can be either:
- The default R2 public URL (format: `https://pub-{account-id}.r2.dev`)
- A custom domain you've configured

**Where to get it:**

**Option 1: Default R2 Public URL**
1. Go to your R2 bucket → Settings
2. Under "Public Access", you'll see the public URL
3. Format: `https://pub-{account-id}.r2.dev`
4. Copy this URL

**Option 2: Custom Domain (Recommended for Production)**
1. Go to your R2 bucket → Settings → Custom Domain
2. Add your custom domain (e.g., `images.bukinpoint.com`)
3. Add the required DNS records (CNAME)
4. Wait for verification
5. Use your custom domain as the public URL

**Example (Default):**
```env
CLOUDFLARE_R2_PUBLIC_URL="https://pub-a1b2c3d4e5f6g7h8.r2.dev"
```

**Example (Custom Domain):**
```env
CLOUDFLARE_R2_PUBLIC_URL="https://images.bukinpoint.com"
```

### Setting Up Public Access

**For Default R2 URL:**
1. Go to R2 bucket → Settings
2. Enable "Public Access"
3. Copy the public URL shown

**For Custom Domain:**
1. Go to R2 bucket → Settings → Custom Domain
2. Enter your domain (e.g., `images.yourdomain.com`)
3. Add the CNAME record to your DNS:
   - **Type**: CNAME
   - **Name**: `images` (or your subdomain)
   - **Target**: The R2 domain provided
4. Wait for DNS propagation (usually a few minutes)
5. Cloudflare will verify automatically

### Image Organization Structure

Images are automatically organized in R2 with the following structure:

```
providers/
  {providerId}/
    services/
      {serviceId}-{timestamp}.jpg
      {serviceId}-{timestamp}.png
    uploads/
      {timestamp}-{filename}.jpg
```

This structure:
- Keeps images organized by provider
- Prevents naming conflicts
- Makes it easy to find and manage images
- Allows for future expansion (logos, staff photos, etc.)

### Image Optimization

**Automatic Optimization:**
- Images are automatically compressed client-side before upload
- Target file size: 2MB maximum
- Quality: 80% (maintains visual quality while reducing size)
- Formats: JPEG, PNG, WebP supported

**File Restrictions:**
- **Max Size**: 2MB (after compression)
- **Allowed Types**: JPEG, JPG, PNG, WebP
- **Validation**: Both client-side and server-side

### Security Considerations

1. **Presigned URLs**: 
   - Time-limited (5 minutes)
   - Provider-scoped (users can only upload to their own provider folder)
   - Validated server-side before generation

2. **Access Control**:
   - Only authenticated users can generate presigned URLs
   - Users can only upload to their own provider's folder
   - Server validates provider access before allowing uploads

3. **File Validation**:
   - File type checked (MIME type and extension)
   - File size validated (max 2MB)
   - Both client and server-side validation

4. **API Tokens**:
   - Store securely in environment variables
   - Never expose in client-side code
   - Rotate periodically

### Troubleshooting

**"Missing Cloudflare R2 configuration" error:**
- Check that all 5 environment variables are set
- Verify variable names are correct (case-sensitive)
- Restart your development server after adding env vars

**"Access denied" when uploading:**
- Verify you're using R2 API Tokens (Access Key ID + Secret Access Key), not regular API tokens
- Check that the token has "Object Read & Write" permissions
- Verify the token is scoped to the correct bucket
- Check that bucket name matches exactly
- Ensure account ID is correct
- If using a regular API token, delete it and create an R2 API Token instead

**Images not displaying:**
- Verify `CLOUDFLARE_R2_PUBLIC_URL` is correct
- Check that public access is enabled on the bucket
- Verify Next.js config includes R2 domain in `remotePatterns`
- Check browser console for CORS errors

**Upload fails:**
- Check file size (must be under 2MB after compression)
- Verify file type is allowed (JPEG, PNG, WebP)
- Check network connection
- Review server logs for detailed error messages
