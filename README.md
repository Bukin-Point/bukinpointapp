# BukinPoint MVP

A modern booking platform built with Next.js 16, featuring provider management, service booking, and payment processing.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Database**: Neon (Serverless Postgres)
- **ORM**: Prisma
- **Auth**: Better Auth
- **State Management**: Zustand
- **Server Interactions**: Server Actions
- **Caching**: Redis (slot locking only)
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Date Utils**: date-fns
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or yarn
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash or self-hosted)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bukinpoint
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

**Important**: You must configure `DATABASE_URL` in your `.env` file before running migrations!

Edit `.env` with your configuration. See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

4. **Optional - Set up DNSMasq for local subdomain development:**

   If you want to test subdomain functionality locally (e.g., `thank-god.bukinpoint.local:3000`), set up DNSMasq:
   
   ```bash
   # Run the automated setup script
   ./scripts/setup-dnsmasq.sh
   ```
   
   Or follow the manual setup in [DNSMASQ_SETUP.md](./DNSMASQ_SETUP.md).
   
   After setup, update your `.env`:
   ```env
   BETTER_AUTH_URL=http://bukinpoint.local:3000
   NEXT_PUBLIC_APP_URL=http://bukinpoint.local:3000
   ```
   
   **Note**: If you don't need subdomain testing, you can skip this step and use `localhost:3000` instead.
- `BETTER_AUTH_SECRET`: Secret key (min 32 characters)
- `BETTER_AUTH_URL`: Your app URL (e.g., http://localhost:3000)
- `NEXT_PUBLIC_APP_URL`: Public app URL (see configuration guide below)
- `PLATFORM_FEE_PERCENTAGE`: Platform fee (default: 10)
- `SLOT_LOCK_TTL`: Slot lock duration in seconds (default: 300)

### Environment Variable Configuration

#### NEXT_PUBLIC_APP_URL

This is the public URL of your application. It's used for:
- Generating absolute URLs for API calls
- OAuth redirects (if using social auth)
- Email links
- Public booking page URLs

**Development:**
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production:**
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**How to get it:**
- **Local development**: Use `http://localhost:3000` (or your dev server port)
- **Production**: Use your deployed domain (e.g., `https://bukinpoint.com`)
- **Staging**: Use your staging domain (e.g., `https://staging.bukinpoint.com`)

**Note**: This must match the URL where your app is accessible. If using Vercel, Netlify, or similar, they usually provide this automatically via environment variables in their dashboard.

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Vitest
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
bukinpoint/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Auth routes (signin, signup)
│   │   ├── (provider)/         # Protected provider routes
│   │   ├── book/               # Public booking pages
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── provider/           # Provider-specific components
│   │   └── booking/            # Booking flow components
│   ├── lib/                    # Utilities and configs
│   ├── stores/                 # Zustand stores
│   ├── actions/                # Server actions
│   └── prisma/                 # Prisma schema
├── __tests__/                  # Test files
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── e2e/                    # E2E tests
└── prisma/                     # Prisma files
```

## Development

This project follows TDD (Test-Driven Development) principles. Write tests first, then implement features.

### Testing

Tests are organized by type:
- **Unit tests**: Test individual components and functions
- **Integration tests**: Test server actions and API flows
- **E2E tests**: Test critical user flows

Run tests:
```bash
npm run test
```

## Testing

See [E2E_TESTING_CHECKLIST.md](./E2E_TESTING_CHECKLIST.md) for a comprehensive list of all flows to test.

## Environment Variables

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed information about configuring environment variables, especially `NEXT_PUBLIC_APP_URL`.

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Documentation Index](./docs/README.md)** - Overview and navigation
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and design
- **[Features](./docs/features/)** - Feature documentation
- **[Process Flows](./docs/flows/)** - Step-by-step flow diagrams
- **[Technical Docs](./docs/technical/)** - Implementation details
- **[User Guides](./docs/guides/)** - End-user documentation
- **[Development](./docs/development/)** - Contributing and deployment

### Quick Links

- [Authentication](./docs/features/authentication.md) - Signup, signin, roles
- [Booking Flow](./docs/flows/booking-flow.md) - Complete booking process
- [Staff Management](./docs/features/staff-management.md) - Staff invitations and permissions
- [Database Schema](./docs/technical/database-schema.md) - Complete schema documentation
- [Permissions](./docs/technical/permissions.md) - Role-based access control

## License

Private - All rights reserved
