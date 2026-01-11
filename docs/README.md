# BukinPoint Documentation

Welcome to the BukinPoint documentation. This directory contains comprehensive documentation for all features, processes, flows, and technical details of the application.

## Documentation Structure

### 📚 Core Documentation

- **[Architecture](./ARCHITECTURE.md)** - System architecture, tech stack, and design patterns

### 🎯 Features Documentation

Detailed documentation for each feature:

- **[Authentication](./features/authentication.md)** - Signup, signin, and role-based access
- **[Provider Onboarding](./features/provider-onboarding.md)** - Business setup and onboarding flow
- **[Services Management](./features/services-management.md)** - Creating and managing services
- **[Staff Management](./features/staff-management.md)** - Staff invitations, roles, and permissions
- **[Availability Management](./features/availability-management.md)** - Setting staff schedules and availability
- **[Bookings](./features/bookings.md)** - Public booking flow and booking management
- **[Customer Accounts](./features/customer-accounts.md)** - Customer signup, dashboard, and booking history
- **[Payments](./features/payments.md)** - Payment processing and transactions
- **[Dashboard](./features/dashboard.md)** - Provider, staff, and customer dashboards
- **[Wallet](./features/wallet.md)** - Earnings tracking and wallet management
- **[Settings](./features/settings.md)** - Business and account settings

### 🔄 Process Flows

Step-by-step flow documentation:

- **[Booking Flow](./flows/booking-flow.md)** - Complete booking process from service selection to confirmation
- **[Staff Invitation Flow](./flows/staff-invitation-flow.md)** - Invitation creation, email sending, and acceptance
- **[Customer Signup Flow](./flows/customer-signup-flow.md)** - Customer account creation and guest booking linking
- **[Payment Flow](./flows/payment-flow.md)** - Payment processing and wallet updates
- **[Authentication Flow](./flows/authentication-flow.md)** - Signin process and role-based redirects

### 🔧 Technical Documentation

Technical implementation details:

- **[Database Schema](./technical/database-schema.md)** - Complete database schema and relationships
- **[Server Actions](./technical/server-actions.md)** - All server actions with schemas
- **[API Routes](./technical/api-routes.md)** - API endpoints and authentication
- **[Permissions](./technical/permissions.md)** - Role-based access control matrix
- **[Redis Integration](./technical/redis-integration.md)** - Slot locking mechanism
- **[Email Integration](./technical/email-integration.md)** - Resend setup and email templates

### 📖 User Guides

User-facing documentation:

- **[Provider Guide](./guides/provider-guide.md)** - Getting started as a business owner
- **[Staff Guide](./guides/staff-guide.md)** - Staff member guide
- **[Customer Guide](./guides/customer-guide.md)** - Customer user guide

### 🛠️ Development Documentation

Development and contribution guidelines:

- **[Contributing](./development/contributing.md)** - How to update documentation and contribute
- **[Testing](./development/testing.md)** - Testing strategy and E2E checklist
- **[Deployment](./development/deployment.md)** - Deployment process and production setup

## Quick Links

### For Developers
- Start with [Architecture](./ARCHITECTURE.md) to understand the system
- Review [Contributing](./development/contributing.md) for documentation standards
- Check [Server Actions](./technical/server-actions.md) for API details

### For Product/QA
- Review [Process Flows](./flows/) for user journey documentation
- Check [Features](./features/) for feature specifications
- See [User Guides](./guides/) for end-user documentation

### For New Team Members
1. Read [Architecture](./ARCHITECTURE.md)
2. Review [Authentication](./features/authentication.md) to understand user roles
3. Explore [Process Flows](./flows/) to understand user journeys
4. Check [Permissions](./technical/permissions.md) for access control

## Documentation Standards

All documentation follows these standards:

- **Clear Structure**: Each document has Overview, Implementation, UI, Edge Cases, and Changelog
- **Code Examples**: Includes relevant code snippets and file paths
- **Diagrams**: Uses Mermaid diagrams for complex flows
- **Changelog**: Tracks all updates with dates
- **Cross-References**: Links to related documentation

## Updating Documentation

When adding or modifying features:

1. Update the relevant feature document in `features/`
2. Update flow documentation if the process changes
3. Update technical docs if implementation changes
4. Add entry to changelog with date
5. Update this README if structure changes

See [Contributing](./development/contributing.md) for detailed guidelines.

## Last Updated

Documentation last updated: January 2025
