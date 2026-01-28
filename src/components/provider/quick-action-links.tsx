'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, Users, Calendar } from 'lucide-react'
import { useProviderContext } from '@/store/provider-context'

export function QuickActionLinks({ providerId }: { providerId: string }) {
  const selectedProviderId = useProviderContext((state) => state.selectedProviderId)
  const finalProviderId = selectedProviderId || providerId

  const getHref = (path: string) => {
    return finalProviderId ? `${path}?providerId=${finalProviderId}` : path
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" className="flex-1 sm:flex-none">
        <Link href={getHref('/services')}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Service</span>
          <span className="sm:hidden">Service</span>
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
        <Link href={getHref('/staff')}>
          <Users className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Staff</span>
          <span className="sm:hidden">Staff</span>
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
        <Link href={getHref('/availability')}>
          <Calendar className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Set Availability</span>
          <span className="sm:hidden">Availability</span>
        </Link>
      </Button>
    </div>
  )
}
