'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProviderContext } from '@/store/provider-context'
import { useEffect, useState } from 'react'

interface ProviderContextErrorProps {
  userId: string
  errorMessage: string
}

export function ProviderContextError({ userId, errorMessage }: ProviderContextErrorProps) {
  const router = useRouter()
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const {
    availableProviders,
    isLoading,
    loadProviders,
    setSelectedProvider,
  } = useProviderContext()

  useEffect(() => {
    loadProviders(userId)
  }, [userId, loadProviders])

  const handleSelectProvider = (providerId: string) => {
    setSelectedProvider(providerId)
    const params = new URLSearchParams(window.location.search)
    params.set('providerId', providerId)
    router.replace(`?${params.toString()}`)
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (availableProviders.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Provider Access</CardTitle>
            <CardDescription>
              You don't have access to any providers. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Provider Access Error</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select a provider:</label>
            <Select
              value={selectedProviderId}
              onValueChange={handleSelectProvider}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span>{provider.businessName}</span>
                      {provider.role && (
                        <span className="text-xs text-muted-foreground">
                          {provider.role === 'OWNER' ? 'Owner' : 'Staff'}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
