# Quick Setup Guide

## Step 1: Create .env file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

## Step 2: Configure Environment Variables

Edit `.env` and set these required values:

### Required Variables:

1. **DATABASE_URL** - Your PostgreSQL connection string
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/bukinpoint?sslmode=require"
   ```
   
   **How to get it:**
   - **Neon (Recommended)**: 
     1. Sign up at https://neon.tech
     2. Create a new project
     3. Copy the connection string from the dashboard
     4. It looks like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
   
   - **Local PostgreSQL**:
     ```env
     DATABASE_URL="postgresql://postgres:password@localhost:5432/bukinpoint"
     ```

2. **REDIS_URL** - Your Redis connection string
   ```env
   REDIS_URL="redis://default:password@host:port"
   ```
   
   **How to get it:**
   - **Upstash (Recommended)**:
     1. Sign up at https://upstash.com
     2. Create a Redis database
     3. Copy the REST URL or connection string
   
   - **Local Redis**:
     ```env
     REDIS_URL="redis://localhost:6379"
     ```

3. **BETTER_AUTH_SECRET** - A secure random string (min 32 characters)
   ```bash
   # Generate one with:
   openssl rand -base64 32
   ```
   Then add to .env:
   ```env
   BETTER_AUTH_SECRET="your-generated-secret-here"
   ```

4. **BETTER_AUTH_URL** - Your app URL
   ```env
   BETTER_AUTH_URL="http://localhost:3000"
   ```

5. **NEXT_PUBLIC_APP_URL** - Public app URL (same as above for local dev)
   ```env
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

### Optional Variables:

- `PLATFORM_FEE_PERCENTAGE="10"` (default: 10)
- `SLOT_LOCK_TTL="300"` (default: 300 seconds = 5 minutes)

## Step 3: Run Database Migrations

Once your `.env` file is configured with `DATABASE_URL`:

```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Generate Prisma Client
- Set up the database schema

## Step 4: Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Troubleshooting

### "Connection url is empty" Error

This means `DATABASE_URL` is not set in your `.env` file. Make sure:
1. You created `.env` file (not just `.env.example`)
2. `DATABASE_URL` is set in the file
3. No quotes around the URL value (or use proper quotes)
4. Run migrations from the project root directory

### "Cannot connect to database" Error

- Check your database is running
- Verify the connection string is correct
- Check network/firewall settings
- For Neon: Ensure SSL mode is set correctly

### Redis Connection Issues

- Make sure Redis is running (if local)
- Verify REDIS_URL is correct
- For Upstash: Check the connection string format

## Next Steps

After setup, see:
- [E2E_TESTING_CHECKLIST.md](./E2E_TESTING_CHECKLIST.md) - Test all features
- [README.md](./README.md) - Full documentation
