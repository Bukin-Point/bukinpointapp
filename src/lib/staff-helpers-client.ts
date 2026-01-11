import { StaffRole } from '@prisma/client'

export interface StaffContext {
  staffMember: {
    id: string
    providerId: string
    role: StaffRole
    userId: string
  }
  provider: {
    id: string
    businessName: string
    userId: string
  }
}

export interface ProviderContext {
  provider: {
    id: string
    businessName: string
    userId: string
  }
}

export type AccessContext = StaffContext | ProviderContext

/**
 * Check if user has permission to access a route
 */
export function canAccessRoute(context: AccessContext | null, route: string): boolean {
  if (!context) {
    return false
  }

  // Providers have full access
  if ('provider' in context && !('staffMember' in context)) {
    return true
  }

  // Staff members have restricted access
  if ('staffMember' in context) {
    const { staffMember } = context

    // OWNER role has full access like provider
    if (staffMember.role === 'OWNER') {
      return true
    }

    // STAFF role has limited access
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
  if ('provider' in context && !('staffMember' in context)) {
    return true
  }

  // Only OWNER role staff can manage staff
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
  if ('provider' in context && !('staffMember' in context)) {
    return true
  }

  // Only OWNER role staff can edit services
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
  if ('provider' in context && !('staffMember' in context)) {
    return true
  }

  // OWNER role can view all bookings
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
  return context !== null && 'staffMember' in context
}

/**
 * Get staff role if user is staff
 */
export function getStaffRole(context: AccessContext | null): StaffRole | null {
  if (context && 'staffMember' in context) {
    return context.staffMember.role
  }
  return null
}

