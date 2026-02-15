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
  }
}

export interface ProviderContext {
  provider: {
    id: string
    businessName: string
    industry: string | null
    userId: string
    businessImage: string | null
  }
}

export type AccessContext = UserProviderContext | ProviderContext

/**
 * Check if user has permission to access a route
 */
export function canAccessRoute(context: AccessContext | null, route: string): boolean {
  if (!context) {
    return false
  }

  // Providers have full access (ProviderContext)
  if (!('userProvider' in context)) {
    return true
  }

  // UserProvider (RBAC) - check roles
  const { userProvider } = context
  // Owner or OWNER role has full access
  const isOwner = userProvider.isOwner || userProvider.roles.some((r) => r.role.name === 'OWNER')

  if (isOwner) {
    return true
  }

  // STAFF role has limited access
  // TODO: Move this to a more robust permission check like `can(context, 'view:settings')`
  const restrictedRoutes = ['/wallet', '/settings', '/staff']
  return !restrictedRoutes.some(restricted => route.startsWith(restricted))
}

/**
 * Check if user can manage staff
 */
export function canManageStaff(context: AccessContext | null): boolean {
  if (!context) {
    return false
  }

  // Providers can manage staff
  if (!('userProvider' in context)) {
    return true
  }

  // UserProvider - check for owner or OWNER role
  return context.userProvider.isOwner || context.userProvider.roles.some((r) => r.role.name === 'OWNER')
}

/**
 * Check if user can edit services
 */
export function canEditServices(context: AccessContext | null): boolean {
  if (!context) {
    return false
  }

  // Providers can edit services
  if (!('userProvider' in context)) {
    return true
  }

  // UserProvider - check for owner or OWNER role
  return context.userProvider.isOwner || context.userProvider.roles.some((r) => r.role.name === 'OWNER')
}

/**
 * Check if user can view all bookings or only their own
 */
export function canViewAllBookings(context: AccessContext | null): boolean {
  if (!context) {
    return false
  }

  // Providers can view all bookings
  if (!('userProvider' in context)) {
    return true
  }

  // UserProvider - check for owner or OWNER role
  return context.userProvider.isOwner || context.userProvider.roles.some((r) => r.role.name === 'OWNER')
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
