import { getProviderDetails } from '@/actions/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Building2,
    Globe,
    Calendar,
    Users,
    Briefcase,
    Wallet,
    ArrowLeft,
    Mail,
    Clock,
    ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'

export default async function ProviderDetailsPage({ params }: { params: { id: string } }) {
    const result = await getProviderDetails(params.id)

    if (!result.success || !result.provider) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-text-secondary">Error: {result.error || 'Provider not found'}</p>
                <Link href="/admin/providers" className="mt-4 flex items-center gap-1 text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Providers
                </Link>
            </div>
        )
    }

    const provider = result.provider as any
    const recentBookings = result.recentBookings as any[]

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/providers" className="rounded-full border p-2 hover:bg-accent transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{provider.businessName}</h1>
                        <p className="text-text-secondary">Provider ID: {provider.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant={provider.status === 'ACTIVE' ? 'outline' : 'secondary'}
                        className={cn(
                            "px-3 py-1",
                            provider.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        )}
                    >
                        {provider.status}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Profile Overview */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Business details</CardTitle>
                        <CardDescription>Primary account and platform settings for this business</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Owner Contact</p>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={provider.user.image} />
                                        <AvatarFallback>{provider.user.name?.[0] || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">{provider.user.name}</p>
                                        <p className="text-xs text-text-secondary">{provider.user.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Subdomain</p>
                                <div className="flex items-center gap-1 text-sm">
                                    <Globe className="h-4 w-4 text-primary" />
                                    <span>{provider.subdomain}.bukinpoint.test</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Business Category</p>
                                <div className="flex items-center gap-1 text-sm">
                                    <Briefcase className="h-4 w-4 text-text-secondary" />
                                    <span>{provider.industry}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Timezone</p>
                                <div className="flex items-center gap-1 text-sm">
                                    <Clock className="h-4 w-4 text-text-secondary" />
                                    <span>{provider.timezone}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-lg bg-primary-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wider text-primary">Wallet Balance</p>
                            <p className="mt-1 text-2xl font-bold text-primary">
                                {formatCurrency(Number(provider.wallet?.balance || 0))}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-text-secondary">Total Bookings</span>
                                <span className="font-semibold">{provider._count.bookings}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-text-secondary">Active Services</span>
                                <span className="font-semibold">{provider.services.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-text-secondary">Staff Members</span>
                                <span className="font-semibold">{provider.userProviders.length}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Staff Members */}
                <Card>
                    <CardHeader>
                        <CardTitle>Staff Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {provider.userProviders.map((membership: any) => (
                                <div key={membership.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={membership.user.image} />
                                            <AvatarFallback>{membership.user.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">{membership.user.name}</p>
                                            <p className="text-xs text-text-secondary">{membership.isOwner ? 'Owner' : 'Staff'}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                        {membership.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Bookings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentBookings.length > 0 ? (
                                recentBookings.map((booking: any) => (
                                    <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium">{booking.service.name}</p>
                                            <p className="text-xs text-text-secondary">
                                                {new Date(booking.bookingDate).toLocaleDateString()} • {booking.startTime}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "text-[10px] uppercase",
                                                booking.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : ''
                                            )}
                                        >
                                            {booking.status}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="py-10 text-center text-sm text-text-secondary">No recent bookings found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
