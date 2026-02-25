import { useProviderContext } from '@/store/provider-context'

// UserProviderContext - RBAC system
export interface UserProviderContext {
  userProvider: {
    id: string
    providerId: string
    userId: string
    isOwner: boolean
    roles: Array<{ role: { name: string } }>
    permissions: Array<{ permission: { name: string } }>
  }
  provider: {
    id: string
    businessName: string
    industry: string | null
    userId: string
    businessImage: string | null
    subdomain: string | null
  }
  permissions: string[] // Flattened permissions from token/DB
}

export interface ProviderContext {
  provider: {
    id: string
    businessName: string
    industry: string | null
    userId: string
    businessImage: string | null
    subdomain: string | null
  }
  permissions: string[] // Providers have full permissions
}

export type AccessContext = UserProviderContext | ProviderContext

/**
 * Check if user has a specific permission
 */
export function hasPermission(context: AccessContext | null, permission: string): boolean {
  if (!context) return false

  // System-wide manage permission always wins
  if (context.permissions.includes('system:manage')) return true

  return context.permissions.includes(permission)
}

/**
 * Check if user has permission to access a route
 */
export function canAccessRoute(context: AccessContext | null, route: string): boolean {
  if (!context) return false

  // Settings & Wallet require specific permissions
  if (route.startsWith('/settings/payments') || route.startsWith('/settings/gateway')) {
    return hasPermission(context, 'manage:settings')
  }

  if (route.startsWith('/settings')) {
    return hasPermission(context, 'manage:settings') || hasPermission(context, 'manage:users')
  }

  if (route.startsWith('/wallet')) {
    return hasPermission(context, 'wallet:read')
  }

  if (route.startsWith('/staff')) {
    return hasPermission(context, 'manage:users')
  }

  if (route.startsWith('/services')) {
    return hasPermission(context, 'service:read') || hasPermission(context, 'service:write')
  }

  // Dashboard and Bookings check
  if (route.startsWith('/dashboard')) return hasPermission(context, 'view:dashboard')
  if (route.startsWith('/bookings')) return hasPermission(context, 'booking:read')

  return true
}

/**
 * Check if user can manage staff
 */
export function canManageStaff(context: AccessContext | null): boolean {
  return hasPermission(context, 'manage:users')
}

/**
 * Check if user can edit services
 */
export function canEditServices(context: AccessContext | null): boolean {
  return hasPermission(context, 'service:write')
}

/**
 * Check if user can view all bookings or only their own
 */
export function canViewAllBookings(context: AccessContext | null): boolean {
  return hasPermission(context, 'booking:read')
}

/**
 * Check if user can view wallet and finance details
 */
export function canViewWallet(context: AccessContext | null): boolean {
  return hasPermission(context, 'wallet:read')
}

/**
 * Check if user can manage roles and permissions
 */
export function canManageRoles(context: AccessContext | null): boolean {
  return hasPermission(context, 'manage:roles')
}

/**
 * Get the provider ID from access context
 */
export function getProviderId(context: AccessContext | null): string | null {
  if (!context) {
    return null
  }

  return context.provider.id
}

/**
 * Check if user is staff (not provider owner acting as provider)
 * Note: If a user is an owner/member, this returns true. 
 * 'ProviderContext' implies the user is the direct Provider record holder (legacy maybe?) or we treat them as such.
 */
export function isStaff(context: AccessContext | null): boolean {
  return context !== null && 'userProvider' in context
}

/**
 * Get staff role if user is staff
 */
export function getStaffRole(context: AccessContext | null): string | null {
  if (context && 'userProvider' in context) {
    // Return first role name for RBAC system
    return context.userProvider.roles[0]?.role.name || null
  }
  return null
}

/**
 * Get selected provider ID from Zustand store (client-side only)
 */
export function getSelectedProviderId(): string | null {
  if (typeof window === 'undefined') return null
  const state = useProviderContext.getState()
  return state.selectedProviderId
}

/**
 * React hook to access provider context
 */
export function useProviderContextHook() {
  return useProviderContext()
}
