# Settings

## Overview

Settings allow providers to manage business details and account settings. Currently supports business details management.

## User Stories

- As a **provider**, I want to update business details so that I can keep information current
- As a **provider**, I want to manage settings so that I can configure my account

## Implementation Details

### Server Actions
- **File**: `src/actions/provider.ts`
- **Function**: `updateProvider()` - Update business details

### Key Components
- `src/components/provider/business-details-form.tsx` - Business details form
- `src/components/provider/settings-nav.tsx` - Settings navigation
- `src/app/(provider)/settings/business/page.tsx` - Business settings page

## User Interface

### Routes
- `/settings` - Settings index (redirects to `/settings/business`)
- `/settings/business` - Business details management

### Business Details Form
- **Fields**: Same as onboarding form
- **Pre-filled**: Current provider data
- **Validation**: Same as onboarding validation

## Permissions
- **Provider**: Full access
- **Staff (OWNER)**: Full access
- **Staff (STAFF)**: No access (route hidden)

## Future Settings
- Profile settings
- Notifications
- Security
- Billing

## Related Features

- [Provider Onboarding](./provider-onboarding.md) - Initial business setup

## Changelog

- **2025-01-10** - Initial settings documentation
