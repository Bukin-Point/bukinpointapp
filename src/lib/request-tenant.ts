import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { extractTenantSubdomain, normalizeHostname } from '@/lib/tenant-host'

export type RequestTenantContext = {
  host: string
  subdomain: string | null
  providerId: string | null
}

export async function resolveRequestTenant(): Promise<RequestTenantContext> {
  const headerStore = await headers()
  const forwardedHost = headerStore.get('x-forwarded-host')
  const host = normalizeHostname(forwardedHost || headerStore.get('host'))
  const subdomain = headerStore.get('x-subdomain') || extractTenantSubdomain(host)
  const headerProviderId = headerStore.get('x-provider-id')

  if (!subdomain) {
    return {
      host,
      subdomain: null,
      providerId: null,
    }
  }

  if (headerProviderId) {
    return {
      host,
      subdomain,
      providerId: headerProviderId,
    }
  }

  const provider = await prisma.provider.findUnique({
    where: { subdomain },
    select: { id: true, status: true },
  })

  return {
    host,
    subdomain,
    providerId: provider?.status === 'ACTIVE' ? provider.id : null,
  }
}
