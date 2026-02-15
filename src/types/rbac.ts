/**
 * RBAC Type Definitions
 * 
 * Types for the new UserProvider-based Role-Based Access Control system
 */

export type UserProviderContext = {
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
        userId: string
        industry: string | null
        businessImage: string | null
        status: string
    }
}

export type ProviderContext = {
    provider: {
        id: string
        businessName: string
        userId: string
        status: string
    }
}

export type AppContext = UserProviderContext | ProviderContext

/**
 * Type guard to check if context has userProvider
 */
export function hasUserProvider(context: AppContext): context is UserProviderContext {
    return 'userProvider' in context
}

/**
 * Check if user has a specific role
 */
export function hasRole(
    userProvider: { roles: Array<{ role: { name: string } }> },
    roleName: string
): boolean {
    return userProvider.roles.some(r => r.role.name === roleName)
}

/**
 * Check if user is owner
 */
export function isOwner(context: AppContext): boolean {
    if (hasUserProvider(context)) {
        return context.userProvider.isOwner || hasRole(context.userProvider, 'OWNER')
    }
    // If it's just a provider context, check if they own it
    return false
}

/**
 * Get all role names for a user provider
 */
export function getRoleNames(
    userProvider: { roles: Array<{ role: { name: string } }> }
): string[] {
    return userProvider.roles.map(r => r.role.name)
}

/**
 * Get all permission names for a user provider
 */
export function getPermissionNames(
    userProvider: {
        roles: Array<{ role: { name: string } }>
        permissions: Array<{ permission: { name: string } }>
    }
): string[] {
    // Get permissions from roles
    const rolePermissions: string[] = [] // This would need to be fetched separately in queries

    // Get direct permissions
    const directPermissions = userProvider.permissions.map(p => p.permission.name)

    return [...new Set([...rolePermissions, ...directPermissions])]
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(
    userProvider: { roles: Array<{ role: { name: string } }> },
    roleNames: string[]
): boolean {
    const userRoles = getRoleNames(userProvider)
    return roleNames.some(role => userRoles.includes(role))
}
