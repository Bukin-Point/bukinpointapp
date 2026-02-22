import { getAllProviders } from '@/actions/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Globe, Calendar, Users, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function AdminProvidersPage() {
    const result = await getAllProviders()

    if (!result.success || !result.providers) {
        return <div>Error loading providers.</div>
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Providers Management</h1>
                <p className="text-text-secondary">
                    Manage all business providers on the platform.
                </p>
            </div>

            <div className="grid gap-6">
                {result.providers.map((provider: any) => (
                    <Card key={provider.id} className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col sm:flex-row">
                                {/* Provider Branding/Info */}
                                <div className="flex flex-1 items-start gap-4 p-6">
                                    <div className="rounded-lg bg-primary-50 p-3 text-primary">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-semibold">{provider.businessName}</h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                                            <div className="flex items-center gap-1">
                                                <Globe className="h-4 w-4" />
                                                <span>{provider.subdomain}.bukinpoint.test</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>Joined {new Date(provider.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Metrics */}
                                <div className="border-t bg-accent/30 p-6 sm:w-80 sm:border-l sm:border-t-0">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-text-secondary">Status</span>
                                            <Badge
                                                variant={provider.status === 'ACTIVE' ? 'outline' : 'secondary'}
                                                className={cn(
                                                    provider.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                )}
                                            >
                                                {provider.status}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-1 text-center">
                                                <p className="text-xs text-text-secondary">Services</p>
                                                <div className="flex items-center justify-center gap-1 font-semibold">
                                                    <Briefcase className="h-3 w-3" />
                                                    {provider._count.services}
                                                </div>
                                            </div>
                                            <div className="space-y-1 text-center">
                                                <p className="text-xs text-text-secondary">Bookings</p>
                                                <div className="flex items-center justify-center gap-1 font-semibold">
                                                    <Users className="h-3 w-3" />
                                                    {provider._count.bookings}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <Link href={`/admin/providers/${provider.id}`} className="block w-full">
                                                <Button variant="outline" size="sm" className="w-full text-xs h-9">
                                                    Manage Provider
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
