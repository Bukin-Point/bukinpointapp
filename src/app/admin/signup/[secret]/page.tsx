'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { promoteToSuperAdmin } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

export default function AdminSignupPage() {
    const params = useParams()
    const router = useRouter()
    const secret = params.secret as string

    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    const handlePromote = async () => {
        setLoading(true)
        setMessage('')
        try {
            const result = await promoteToSuperAdmin(secret)
            if (result.error) {
                setStatus('error')
                setMessage(result.error)
            } else {
                setStatus('success')
                setMessage('You are now a Super Admin! Redirecting to dashboard...')
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
            }
        } catch (err) {
            setStatus('error')
            setMessage('An unexpected error occurred.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Admin Promotion</CardTitle>
                    <CardDescription>
                        You have accessed a restricted administrative setup page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status === 'error' && (
                        <div className="flex items-start gap-3 rounded-md bg-error/10 p-4 text-sm text-error">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{message}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                            {message}
                        </div>
                    )}

                    {status === 'idle' && (
                        <p className="text-center text-body-sm text-text-secondary">
                            Click the button below to elevate your account to Super Admin status for this platform.
                        </p>
                    )}
                </CardContent>
                <CardFooter>
                    {status === 'idle' && (
                        <Button
                            className="w-full"
                            onClick={handlePromote}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Processing...
                                </>
                            ) : (
                                'Confirm Admin Promotion'
                            )}
                        </Button>
                    )}
                    {status === 'success' && (
                        <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard')}>
                            Go to Dashboard Now
                        </Button>
                    )}
                    {status === 'error' && (
                        <Button variant="outline" className="w-full" onClick={() => setStatus('idle')}>
                            Try Again
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}
