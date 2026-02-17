import { getAllPlatformUsers } from '@/actions/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Calendar, BookOpen, UserPlus } from 'lucide-react'

export default async function AdminCustomersPage() {
    const result = await getAllPlatformUsers()

    if (!result.success || !result.users) {
        return <div>Error loading users.</div>
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Platform Users</h1>
                <p className="text-text-secondary">
                    Overview of all registered customers and staff across the platform.
                </p>
            </div>

            <div className="grid gap-4">
                {result.users.map((user: any) => (
                    <Card key={user.id}>
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.image} alt={user.name || ''} />
                                    <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-sm font-semibold">{user.name || 'Anonymous User'}</h3>
                                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                                        <Mail className="h-3 w-3" />
                                        <span>{user.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-8">
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-text-secondary uppercase tracking-wider">Bookings</span>
                                    <div className="flex items-center gap-1 font-semibold">
                                        <BookOpen className="h-3 w-3 text-primary" />
                                        {user._count.bookings}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-xs text-text-secondary uppercase tracking-wider">Memberships</span>
                                    <div className="flex items-center gap-1 font-semibold">
                                        <UserPlus className="h-3 w-3 text-primary" />
                                        {user._count.userProviders}
                                    </div>
                                </div>
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-xs text-text-secondary uppercase tracking-wider">Joined Platform</span>
                                    <div className="flex items-center gap-1 text-sm">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(user.createdAt).toLocaleDateString()}
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
