import { useProviderContext } from '@/store/provider-context'

// Legacy StaffContext - keep for backward compatibility during migration
export interface StaffContext {
  staffMember: {
    id: string
    providerId: string
    role: string // Changed from StaffRole to string for flexibility
    userId: string
  }
  provider: {
    id: string
    businessName: string
    industry: string | null
    userId: string
    businessImage: string | null
  }
}

// New UserProviderContext - RBAC system
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

export type AccessContext = UserProviderContext | StaffContext | ProviderContext

/**
 * Check if user has permission to access a route
 */
export function canAccessRoute(context: AccessContext | null, route: string): boolean {
  if (!context) {
    return false
  }

  // Providers have full access
  if ('provider' in context && !('staffMember' in context) && !('userProvider' in context)) {
    return true
  }

  // UserProvider (new RBAC) - check roles
  if ('userProvider' in context) {
    const { userProvider } = context
    // Owner or OWNER role has full access
    if (userProvider.isOwner || userProvider.roles.some((r: { role: { name: string } }) => r.role.name === 'OWNER')) {
      return true
    }
    // STAFF role has limited access
    const restrictedRoutes = ['/wallet', '/settings', '/staff']
    return !restrictedRoutes.some(restricted => route.startsWith(restricted))
  }

  // Legacy StaffMember - check role string
  if ('staffMember' in context) {
    const { staffMember } = context
    if (staffMember.role === 'OWNER') {
      return true
    }
    const restrictedRoutes = ['/wallet', '/settings', '/staff']
    return !restrictedRoutes.some(restricted => route.startsWith(restricted))
  }

  return false
}

/**
 * Check if user can manage staff
 */
export function canManageStaff(context: AccessContext | null): boolean {
  if (!context) {
    return false
  }

  // Providers can manage staff
  if ('provider' in context && !('staffMember' in context) && !('userProvider' in context)) {
    return true
  }

  // UserProvider - check for owner or OWNER role
  if ('userProvider' in context) {
    return context.userProvider.isOwner || context.userProvider.roles.some((r: { role: { name: string } }) => r.role.name === 'OWNER')
  }

  // Legacy StaffMember - check role
  if ('staffMember' in context) {
    return context.staffMember.role === 'OWNER'
  }

  return false
}

/**
 * Check if user can edit services
 */
export function canEditServices(context: AccessContext | null): boolean {
  if (!context) {
    return false
  }

  // Providers can edit services
  if ('provider' in context && !('staffMember' in context) && !('userProvider' in context)) {
    return true
  }

  // UserProvider - check for owner or OWNER role
  if ('userProvider' in context) {
    return context.userProvider.isOwner || context.userProvider.roles.some((r: { role: { name: string } }) => r.role.name === 'OWNER')
  }

  // Legacy StaffMember - check role
  if ('staffMember' in context) {
    return context.staffMember.role === 'OWNER'
  }

  return false
}

/**
 * Check if user can view all bookings or only their own
 */
export function canViewAllBookings(context: AccessContext | null): boolean {
  if (!context) {
    return false
  }

  // Providers can view all bookings
  if ('provider' in context && !('staffMember' in context) && !('userProvider' in context)) {
    return true
  }

  // UserProvider - check for owner or OWNER role
  if ('userProvider' in context) {
    return context.userProvider.isOwner || context.userProvider.roles.some((r: { role: { name: string } }) => r.role.name === 'OWNER')
  }

  // Legacy StaffMember - OWNER role can view all
  if ('staffMember' in context) {
    return context.staffMember.role === 'OWNER'
  }

  return false
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
 * Check if user is staff (not provider)
 */
export function isStaff(context: AccessContext | null): boolean {
  return context !== null && ('staffMember' in context || 'userProvider' in context)
}

/**
 * Get staff role if user is staff
 */
export function getStaffRole(context: AccessContext | null): string | null {
  if (context && 'staffMember' in context) {
    return context.staffMember.role
  }
  if (context && 'userProvider' in context) {
    // Return first role name for new RBAC system
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
