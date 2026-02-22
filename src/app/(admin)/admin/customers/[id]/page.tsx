import { getCustomerDetails } from '@/actions/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    User,
    Mail,
    Calendar,
    BookOpen,
    ArrowLeft,
    Building2,
    Clock,
    CreditCard
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
    const result = await getCustomerDetails(params.id)

    if (!result.success || !result.user) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-text-secondary">Error: {result.error || 'Customer not found'}</p>
                <Link href="/admin/customers" className="mt-4 flex items-center gap-1 text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Customers
                </Link>
            </div>
        )
    }

    const user = result.user as any

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/customers" className="rounded-full border p-2 hover:bg-accent transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Customer Profile</h1>
                    <p className="text-text-secondary">User ID: {user.id}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                {/* User Identity */}
                <Card className="md:col-span-1">
                    <CardHeader className="flex flex-col items-center text-center">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback><User className="h-12 w-12 text-text-secondary" /></AvatarFallback>
                        </Avatar>
                        <CardTitle className="mt-4">{user.name || 'Anonymous User'}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Member Since</span>
                            <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Total Bookings</span>
                            <span className="font-medium font-bold text-primary">{user.bookings.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-text-secondary">Businesses</span>
                            <span className="font-medium">{user._count.userProviders}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Booking History */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Platform-wide Booking History</CardTitle>
                        <CardDescription>A complete log of appointments this user has booked across all platform providers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {user.bookings.length > 0 ? (
                                user.bookings.map((booking: any) => (
                                    <div key={booking.id} className="group relative flex flex-col gap-4 rounded-xl border p-4 hover:bg-accent/30 transition-colors sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-sm">{booking.service.name}</h4>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        <span>{booking.provider.businessName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{new Date(booking.bookingDate).toLocaleDateString()} • {booking.startTime}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
                                            <div className="flex flex-col items-end mr-4">
                                                <p className="text-xs font-medium text-text-secondary">Payment</p>
                                                <div className="flex items-center gap-1 text-sm font-semibold">
                                                    {booking.transaction ? (
                                                        <>
                                                            <CreditCard className="h-3 w-3 text-green-600" />
                                                            <span>{formatCurrency(Number(booking.transaction.amount))}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-text-secondary">No Data</span>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "uppercase text-[10px]",
                                                    booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : ''
                                                )}
                                            >
                                                {booking.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center text-text-secondary">
                                    <BookOpen className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                    <p>This user hasn't made any bookings on the platform yet.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
