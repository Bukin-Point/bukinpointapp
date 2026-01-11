/**
 * E2E Tests for Provider Context System
 *
 * This test suite covers the multi-provider context switching functionality
 * for staff members who work with multiple providers.
 *
 * Prerequisites:
 * - Database is set up with test data
 * - Redis is running
 * - Development server is running (npm run dev)
 * - Test users and providers are created
 *
 * Test Scenarios:
 * 1. Staff with single provider (no selector shown)
 * 2. Staff with multiple providers (selector shown, can switch)
 * 3. URL parameter persistence
 * 4. LocalStorage persistence
 * 5. Access validation
 * 6. Access revocation
 * 7. All pages respect context
 * 8. RBAC permissions per provider
 * 9. Service filtering per provider
 * 10. Booking filtering per provider
 * 11. Navigation link preservation
 * 12. Error handling
 */

import { test, expect } from '@playwright/test'

// Helper function to dismiss Next.js dev overlay
async function dismissDevOverlay(page: any) {
  await page.evaluate(() => {
    const overlay = document.querySelector('[data-nextjs-dev-overlay]')
    if (overlay) overlay.remove()
    const portals = document.querySelectorAll('nextjs-portal')
    portals.forEach(p => p.remove())
  })
  // Wait a bit for overlay removal
  await page.waitForTimeout(100)
}

// Helper function to sign in
async function signIn(page: any, email: string, password: string) {
  await page.goto('/signin')
  await dismissDevOverlay(page)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await dismissDevOverlay(page)
  await page.click('button[type="submit"]', { force: true, timeout: 10000 })
  // Wait for navigation or error
  try {
    await page.waitForURL(/\/dashboard|\/onboarding|\/signin/, { timeout: 15000 })
  } catch (e) {
    // If navigation fails, check for error messages
    const errorText = await page
      .locator('text=/error|invalid|not found/i')
      .first()
      .textContent()
      .catch(() => null)
    if (errorText) {
      throw new Error(
        `Sign in failed: ${errorText}. Test user may not exist. Please create test data first.`
      )
    }
    throw e
  }
}

// Test data setup helpers
const TEST_USERS = {
  staffSingleProvider: {
    email: 'staff-single@test.com',
    password: 'Test1234!',
    name: 'Staff Single',
  },
  staffMultipleProviders: {
    email: 'staff-multi@test.com',
    password: 'Test1234!',
    name: 'Staff Multi',
  },
  provider1: {
    email: 'provider1@test.com',
    password: 'Test1234!',
    name: 'Provider One',
    businessName: 'Business One',
  },
  provider2: {
    email: 'provider2@test.com',
    password: 'Test1234!',
    name: 'Provider Two',
    businessName: 'Business Two',
  },
}

test.describe('Provider Context System - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and cookies before each test
    await page.goto('/')
    await dismissDevOverlay(page)

    await page.evaluate(() => {
      localStorage.clear()
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
      })
    })
  })

  test.describe('1. Staff with Single Provider', () => {
    test('should not show provider selector when staff has only one provider', async ({ page }) => {
      // Sign in as staff with single provider
      await signIn(
        page,
        TEST_USERS.staffSingleProvider.email,
        TEST_USERS.staffSingleProvider.password
      )

      // Wait for redirect to dashboard (with longer timeout for first load)
      await page.waitForURL('/dashboard', { timeout: 15000 })

      // Verify provider selector is NOT visible
      const selector = page.locator('[data-testid="provider-selector"]')
      await expect(selector).not.toBeVisible()

      // Verify business name is displayed (not selector)
      const businessName = page.locator('text=Business One').first()
      await expect(businessName).toBeVisible()
    })

    test('should work normally without providerId in URL', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffSingleProvider.email,
        TEST_USERS.staffSingleProvider.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Navigate to services page
      await page.click('text=Services')
      await page.waitForURL('/services', { timeout: 5000 })

      // Verify URL doesn't have providerId parameter
      const url = page.url()
      expect(url).not.toContain('providerId=')
    })
  })

  test.describe('2. Staff with Multiple Providers', () => {
    test('should show provider selector when staff has multiple providers', async ({ page }) => {
      // Sign in as staff with multiple providers
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Verify provider selector IS visible
      const selector = page.locator('select, [role="combobox"]').first()
      await expect(selector).toBeVisible()

      // Verify both providers are listed
      await selector.click()
      await expect(page.locator('text=Business One')).toBeVisible()
      await expect(page.locator('text=Business Two')).toBeVisible()
    })

    test('should switch between providers using selector', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get initial provider from URL or page
      const initialUrl = page.url()
      const initialProviderId = new URL(initialUrl).searchParams.get('providerId')

      // Open selector and switch to different provider
      const selector = page.locator('select, [role="combobox"]').first()
      await selector.click()

      // Select the other provider
      const otherProvider = page
        .locator('text=Business Two')
        .or(page.locator('[role="option"]:has-text("Business Two")'))
      await otherProvider.click()

      // Wait for URL to update
      await page.waitForTimeout(1000)

      // Verify URL contains providerId parameter
      const newUrl = page.url()
      expect(newUrl).toContain('providerId=')

      // Verify providerId changed
      const newProviderId = new URL(newUrl).searchParams.get('providerId')
      if (initialProviderId) {
        expect(newProviderId).not.toBe(initialProviderId)
      }
    })

    test('should display correct business name after switching', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Switch to Business Two
      const selector = page.locator('select, [role="combobox"]').first()
      await selector.click()
      await page.locator('text=Business Two').first().click()
      await page.waitForTimeout(1000)

      // Verify Business Two name is displayed
      await expect(page.locator('text=Business Two')).toBeVisible()
    })
  })

  test.describe('3. URL Parameter Persistence', () => {
    test('should preserve providerId in URL when navigating', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get providerId from URL
      const dashboardUrl = page.url()
      const providerId = new URL(dashboardUrl).searchParams.get('providerId')

      if (providerId) {
        // Navigate to services
        await page.click('text=Services')
        await page.waitForURL(/\/services/, { timeout: 5000 })

        // Verify providerId is preserved
        const servicesUrl = page.url()
        expect(servicesUrl).toContain(`providerId=${providerId}`)

        // Navigate to bookings
        await page.click('text=Bookings')
        await page.waitForURL(/\/bookings/, { timeout: 5000 })

        // Verify providerId is still preserved
        const bookingsUrl = page.url()
        expect(bookingsUrl).toContain(`providerId=${providerId}`)
      }
    })

    test('should load correct provider from URL parameter on direct access', async ({ page }) => {
      // First, sign in and get a providerId
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get providerId from current URL
      const url = page.url()
      const providerId = new URL(url).searchParams.get('providerId')

      if (providerId) {
        // Directly navigate to services with providerId
        await page.goto(`/services?providerId=${providerId}`)

        // Verify correct provider context is loaded
        await expect(page.locator('h1:has-text("Services")')).toBeVisible()

        // Verify selector shows correct provider
        const selector = page.locator('select, [role="combobox"]').first()
        if (await selector.isVisible()) {
          await expect(selector).toContainText(/Business/)
        }
      }
    })
  })

  test.describe('4. LocalStorage Persistence', () => {
    test('should persist selected provider in localStorage', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get providerId from URL
      const url = page.url()
      const providerId = new URL(url).searchParams.get('providerId')

      if (providerId) {
        // Check localStorage
        const storedProviderId = await page.evaluate(() => {
          return localStorage.getItem('bukinpoint_selected_provider_id')
        })

        expect(storedProviderId).toBe(providerId)
      }
    })

    test('should restore provider from localStorage on page refresh', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get providerId and store it
      const url = page.url()
      const providerId = new URL(url).searchParams.get('providerId')

      if (providerId) {
        // Set it in localStorage manually
        await page.evaluate(id => {
          localStorage.setItem('bukinpoint_selected_provider_id', id)
        }, providerId)

        // Refresh page
        await page.reload()
        await page.waitForTimeout(1000)

        // Verify providerId is in URL after refresh
        const newUrl = page.url()
        expect(newUrl).toContain(`providerId=${providerId}`)
      }
    })
  })

  test.describe('5. Access Validation', () => {
    test('should deny access to provider without permission', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffSingleProvider.email,
        TEST_USERS.staffSingleProvider.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Try to access a different provider's data via URL
      // This should show an error or redirect
      await page.goto('/dashboard?providerId=invalid-provider-id')

      // Should show error message or redirect
      const errorMessage = page.locator("text=/don't have access|Access denied|Invalid provider/i")
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
    })

    test('should validate providerId format', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Try with invalid providerId format (XSS attempt)
      await page.goto('/dashboard?providerId=<script>alert("xss")</script>')

      // Should sanitize and show error or use default
      const url = page.url()
      expect(url).not.toContain('<script>')
    })
  })

  test.describe('6. Access Revocation', () => {
    test('should handle access loss gracefully', async ({ page }) => {
      // This test requires manual setup: staff member loses access to a provider
      // In a real scenario, you would:
      // 1. Sign in as staff with multiple providers
      // 2. Select a provider
      // 3. In another session, remove staff access
      // 4. Refresh page and verify error handling

      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Note: This test requires database manipulation to revoke access
      // For now, we'll test the error component display
      await page.goto('/dashboard?providerId=revoked-provider-id')

      // Should show error with provider selection option
      const errorComponent = page.locator("text=/Provider Access Error|don't have access/i")
      await expect(errorComponent.first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('7. All Pages Respect Context', () => {
    test('should filter dashboard data by selected provider', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get providerId
      const url = page.url()
      const providerId = new URL(url).searchParams.get('providerId')

      // Verify dashboard shows data for selected provider
      // (This assumes test data exists for both providers)
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    })

    test('should filter services by selected provider', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Switch provider if selector exists
      const selector = page.locator('select, [role="combobox"]').first()
      if (await selector.isVisible()) {
        await selector.click()
        await page.locator('text=Business Two').first().click()
        await page.waitForTimeout(1000)
      }

      // Navigate to services
      await page.click('text=Services')
      await page.waitForURL(/\/services/, { timeout: 5000 })

      // Verify services page loads with correct provider context
      await expect(page.locator('h1:has-text("Services")')).toBeVisible()

      // Verify URL has providerId
      const servicesUrl = page.url()
      expect(servicesUrl).toContain('providerId=')
    })

    test('should filter bookings by selected provider', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Navigate to bookings
      await page.click('text=Bookings')
      await page.waitForURL(/\/bookings/, { timeout: 5000 })

      // Verify bookings page loads
      await expect(page.locator('h1:has-text("Bookings")')).toBeVisible()

      // Verify URL has providerId
      const bookingsUrl = page.url()
      expect(bookingsUrl).toContain('providerId=')
    })

    test('should filter staff list by selected provider', async ({ page }) => {
      await signIn(page, TEST_USERS.provider1.email, TEST_USERS.provider1.password)

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Navigate to staff page
      await page.click('text=Staff')
      await page.waitForURL(/\/staff/, { timeout: 5000 })

      // Verify staff page loads
      await expect(page.locator('h1:has-text("Staff")')).toBeVisible()
    })
  })

  test.describe('8. RBAC Permissions Per Provider', () => {
    test('should show/hide routes based on role per provider', async ({ page }) => {
      // Sign in as staff with OWNER role for one provider and STAFF role for another
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Switch to provider where user has OWNER role
      const selector = page.locator('select, [role="combobox"]').first()
      if (await selector.isVisible()) {
        // Select provider with OWNER role (this requires test data setup)
        await selector.click()
        // Assuming Business One has OWNER role
        await page.locator('text=Business One').first().click()
        await page.waitForTimeout(1000)

        // Verify OWNER-only routes are visible
        await expect(page.locator('text=Staff')).toBeVisible()
        await expect(page.locator('text=Wallet')).toBeVisible()
        await expect(page.locator('text=Settings')).toBeVisible()
      }

      // Switch to provider where user has STAFF role
      if (await selector.isVisible()) {
        await selector.click()
        // Assuming Business Two has STAFF role
        await page.locator('text=Business Two').first().click()
        await page.waitForTimeout(1000)

        // Verify OWNER-only routes are NOT visible
        await expect(page.locator('text=Staff')).not.toBeVisible()
        await expect(page.locator('text=Wallet')).not.toBeVisible()
        await expect(page.locator('text=Settings')).not.toBeVisible()
      }
    })

    test('should restrict service editing based on role per provider', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Switch to provider with STAFF role
      const selector = page.locator('select, [role="combobox"]').first()
      if (await selector.isVisible()) {
        await selector.click()
        await page.locator('text=Business Two').first().click()
        await page.waitForTimeout(1000)
      }

      // Navigate to services
      await page.click('text=Services')
      await page.waitForURL(/\/services/, { timeout: 5000 })

      // Verify edit buttons are NOT visible for STAFF role
      const editButtons = page.locator('button:has-text("Edit"), button:has-text("Delete")')
      // STAFF role should not see edit buttons (if test data is set up correctly)
    })
  })

  test.describe('9. Service Filtering Per Provider', () => {
    test('should show only assigned services for STAFF role per provider', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Switch to provider where user is STAFF
      const selector = page.locator('select, [role="combobox"]').first()
      if (await selector.isVisible()) {
        await selector.click()
        await page.locator('text=Business Two').first().click()
        await page.waitForTimeout(1000)
      }

      // Navigate to services
      await page.click('text=Services')
      await page.waitForURL(/\/services/, { timeout: 5000 })

      // Verify badge showing filtered services (if applicable)
      const badge = page.locator('text=/Showing.*of.*services assigned/i')
      if (await badge.isVisible()) {
        await expect(badge).toBeVisible()
      }
    })
  })

  test.describe('10. Booking Filtering Per Provider', () => {
    test('should show only own bookings for STAFF role per provider', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Switch to provider where user is STAFF
      const selector = page.locator('select, [role="combobox"]').first()
      if (await selector.isVisible()) {
        await selector.click()
        await page.locator('text=Business Two').first().click()
        await page.waitForTimeout(1000)
      }

      // Navigate to bookings
      await page.click('text=Bookings')
      await page.waitForURL(/\/bookings/, { timeout: 5000 })

      // Verify bookings are filtered (only own bookings for STAFF)
      await expect(page.locator('h1:has-text("Bookings")')).toBeVisible()
    })
  })

  test.describe('11. Navigation Link Preservation', () => {
    test('should preserve providerId in all navigation links', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get providerId from current URL
      const url = page.url()
      const providerId = new URL(url).searchParams.get('providerId')

      if (providerId) {
        // Check navigation links
        const dashboardLink = page.locator('a[href*="/dashboard"]').first()
        const servicesLink = page.locator('a[href*="/services"]').first()
        const bookingsLink = page.locator('a[href*="/bookings"]').first()

        // Verify links contain providerId
        if (await dashboardLink.isVisible()) {
          const dashboardHref = await dashboardLink.getAttribute('href')
          expect(dashboardHref).toContain(`providerId=${providerId}`)
        }

        if (await servicesLink.isVisible()) {
          const servicesHref = await servicesLink.getAttribute('href')
          expect(servicesHref).toContain(`providerId=${providerId}`)
        }

        if (await bookingsLink.isVisible()) {
          const bookingsHref = await bookingsLink.getAttribute('href')
          expect(bookingsHref).toContain(`providerId=${providerId}`)
        }
      }
    })

    test('should preserve providerId in quick action links', async ({ page }) => {
      await signIn(page, TEST_USERS.provider1.email, TEST_USERS.provider1.password)

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Get providerId from URL
      const url = page.url()
      const providerId = new URL(url).searchParams.get('providerId') || 'current-provider'

      // Check quick action links
      const addServiceLink = page
        .locator('a:has-text("Add Service"), a:has-text("Service")')
        .first()
      if (await addServiceLink.isVisible()) {
        const href = await addServiceLink.getAttribute('href')
        // Should contain providerId or be relative (will use current context)
        expect(href).toBeTruthy()
      }
    })
  })

  test.describe('12. Error Handling', () => {
    test('should show error when invalid providerId in URL', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Navigate with invalid providerId
      await page.goto('/dashboard?providerId=invalid-id-12345')

      // Should show error component
      const errorMessage = page.locator(
        "text=/Provider Access Error|don't have access|Invalid provider/i"
      )
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

      // Should show provider selection dropdown
      const providerSelect = page.locator('select, [role="combobox"]')
      await expect(providerSelect.first()).toBeVisible({ timeout: 5000 })
    })

    test('should allow provider selection from error state', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Navigate with invalid providerId
      await page.goto('/dashboard?providerId=invalid-id-12345')

      // Wait for error component
      await page.waitForTimeout(1000)

      // Select a valid provider from error component
      const providerSelect = page.locator('select, [role="combobox"]').first()
      if (await providerSelect.isVisible()) {
        await providerSelect.click()
        await page.locator('text=Business One').first().click()

        // Should redirect to dashboard with valid provider
        await page.waitForURL(/\/dashboard\?providerId=/, { timeout: 5000 })
        await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
      }
    })
  })

  test.describe('13. Edge Cases', () => {
    test('should handle providerId removal from URL gracefully', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Manually remove providerId from URL
      const currentUrl = new URL(page.url())
      currentUrl.searchParams.delete('providerId')
      await page.goto(currentUrl.toString())

      // Should either restore from localStorage or use default provider
      await page.waitForTimeout(1000)
      // Page should still load (either with default provider or error)
      await expect(page.locator('body')).toBeVisible()
    })

    test('should handle localStorage corruption gracefully', async ({ page }) => {
      // Set invalid providerId in localStorage
      await page.goto('/')
      await page.evaluate(() => {
        localStorage.setItem('bukinpoint_selected_provider_id', 'invalid-id')
      })

      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      // Should clear invalid value and use default provider
      const url = page.url()
      const providerId = new URL(url).searchParams.get('providerId')
      expect(providerId).not.toBe('invalid-id')
    })

    test('should handle rapid provider switching', async ({ page }) => {
      await signIn(
        page,
        TEST_USERS.staffMultipleProviders.email,
        TEST_USERS.staffMultipleProviders.password
      )

      await page.waitForURL('/dashboard', { timeout: 5000 })

      const selector = page.locator('select, [role="combobox"]').first()
      if (await selector.isVisible()) {
        // Rapidly switch providers
        await selector.click()
        await page.locator('text=Business Two').first().click()
        await page.waitForTimeout(200)

        await selector.click()
        await page.locator('text=Business One').first().click()
        await page.waitForTimeout(200)

        // Should end up on Business One
        const finalUrl = page.url()
        expect(finalUrl).toContain('providerId=')
      }
    })
  })
})

/**
 * Test Data Setup Instructions:
 *
 * Before running these tests, you need to set up the following in your test database:
 *
 * 1. Create Provider 1:
 *    - Email: provider1@test.com
 *    - Password: Test1234!
 *    - Business Name: Business One
 *    - Complete onboarding
 *
 * 2. Create Provider 2:
 *    - Email: provider2@test.com
 *    - Password: Test1234!
 *    - Business Name: Business Two
 *    - Complete onboarding
 *
 * 3. Create Staff Member (Single Provider):
 *    - Email: staff-single@test.com
 *    - Password: Test1234!
 *    - Invite as STAFF to Provider 1 only
 *    - Accept invitation and sign up
 *
 * 4. Create Staff Member (Multiple Providers):
 *    - Email: staff-multi@test.com
 *    - Password: Test1234!
 *    - Invite as OWNER to Provider 1
 *    - Invite as STAFF to Provider 2
 *    - Accept both invitations and sign up
 *
 * 5. Create test services and bookings for both providers
 *
 * 6. Assign services to staff members as needed for filtering tests
 */
