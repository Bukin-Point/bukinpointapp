const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'dev',
  'stage',
  'staging',
  'stagging',
  'notifications',
  'bukinpoint',
])

export function normalizeHostname(hostname: string | null | undefined): string {
  return (hostname || '').split(':')[0].trim().toLowerCase()
}

export function extractTenantSubdomain(hostname: string | null | undefined): string | null {
  const host = normalizeHostname(hostname)

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null
  }

  if (host.endsWith('.vercel.app')) {
    const prefix = host.slice(0, -'.vercel.app'.length)
    const parts = prefix.split('.')
    const candidate = parts.length >= 2 ? parts[0] : null
    return candidate && !RESERVED_SUBDOMAINS.has(candidate) ? candidate : null
  }

  const parts = host.split('.')

  if (host.endsWith('.localhost')) {
    if (parts.length < 2) return null
  } else if (host.endsWith('.test')) {
    if (parts.length < 3) return null
  } else if (parts.length < 3) {
    return null
  }

  const candidate = parts[0]
  if (!candidate || RESERVED_SUBDOMAINS.has(candidate)) {
    return null
  }

  return candidate
}

export function isTenantSubdomain(hostname: string | null | undefined): boolean {
  return extractTenantSubdomain(hostname) !== null
}
