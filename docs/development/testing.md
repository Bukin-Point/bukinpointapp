# Testing

## Overview

BukinPoint uses Vitest for testing with a Test-Driven Development (TDD) approach.

## Test Structure

Tests are organized in `__tests__/`:
- `unit/` - Unit tests for components and functions
- `integration/` - Integration tests for server actions
- `e2e/` - End-to-end tests for user flows

## Running Tests

### All Tests
```bash
npm run test
```

### With UI
```bash
npm run test:ui
```

### With Coverage
```bash
npm run test:coverage
```

## Test Types

### Unit Tests
- Test individual components
- Test utility functions
- Test validation logic

### Integration Tests
- Test server actions
- Test database operations
- Test API flows

### E2E Tests
- Test complete user flows
- Test critical paths
- Test error scenarios

## E2E Testing Checklist

See `E2E_TESTING_CHECKLIST.md` in project root for comprehensive test cases covering:
- Authentication flows
- Provider onboarding
- Services management
- Staff management
- Bookings
- Customer accounts
- Payments

## Writing Tests

### Component Test Example
```typescript
import { render, screen } from '@testing-library/react'
import { ComponentName } from '@/components/component-name'

test('renders component', () => {
  render(<ComponentName />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

### Server Action Test Example
```typescript
import { createService } from '@/actions/services'

test('creates service', async () => {
  const result = await createService({
    providerId: 'test-id',
    name: 'Test Service',
    duration: 60,
    price: 5000,
    isActive: true,
  })
  
  expect(result.success).toBe(true)
  expect(result.service).toBeDefined()
})
```

## Test Coverage Goals

- Critical paths: 100%
- Server actions: 80%+
- Components: 70%+
- Utilities: 90%+

## Related Documentation

- [E2E Testing Checklist](../../E2E_TESTING_CHECKLIST.md) - Test cases
- [Contributing](./contributing.md) - Development guidelines

## Changelog

- **2025-01-10** - Initial testing documentation
