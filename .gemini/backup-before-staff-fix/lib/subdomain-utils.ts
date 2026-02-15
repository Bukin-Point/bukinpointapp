/**
 * Subdomain generation and validation utilities
 */

/**
 * Reserved subdomains that cannot be used
 */
const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'ftp',
  'localhost',
  'staging',
  'test',
  'dev',
  'blog',
  'support',
  'help',
  'docs',
  'cdn',
  'static',
  'assets',
]

/**
 * Generate a URL-safe subdomain from business name
 */
export function generateSubdomain(businessName: string): string {
  if (!businessName || businessName.trim().length === 0) {
    return `business-${Date.now().toString().slice(-6)}`
  }

  return businessName
    .toLowerCase()
    .trim()
    // Replace spaces and special chars with hyphens
    .replace(/[^a-z0-9-]/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 63 characters (DNS limit)
    .substring(0, 63)
}

/**
 * Check if subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())
}

/**
 * Generate a unique subdomain by appending a number if needed
 */
export async function generateUniqueSubdomain(
  baseSubdomain: string,
  checkExists: (subdomain: string) => Promise<boolean>
): Promise<string> {
  // Check if base subdomain is valid
  if (!baseSubdomain || baseSubdomain.length < 3) {
    baseSubdomain = 'business'
  }

  // Check if reserved
  if (isReservedSubdomain(baseSubdomain)) {
    baseSubdomain = `${baseSubdomain}-biz`
  }

  // Try base subdomain first
  let subdomain = baseSubdomain
  let counter = 1

  // Check if exists and increment counter if needed
  while (await checkExists(subdomain)) {
    const suffix = counter.toString()
    const maxLength = 63 - suffix.length - 1 // -1 for hyphen
    const truncated = baseSubdomain.substring(0, maxLength)
    subdomain = `${truncated}-${suffix}`
    counter++

    // Safety limit to prevent infinite loops
    if (counter > 9999) {
      // Fallback to random string
      subdomain = `${baseSubdomain.substring(0, 50)}-${Date.now().toString().slice(-6)}`
      break
    }
  }

  return subdomain
}
