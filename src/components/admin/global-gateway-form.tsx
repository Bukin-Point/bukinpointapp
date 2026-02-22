'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { updateGlobalGateway } from '@/actions/admin'
import { useToast } from '@/hooks/use-toast'
import { PaymentGateway } from '@prisma/client'
import { ShieldAlert } from 'lucide-react'

interface GlobalGatewayFormProps {
    currentDefault: PaymentGateway
}

export function GlobalGatewayForm({ currentDefault }: GlobalGatewayFormProps) {
    const { toast } = useToast()
    const [value, setValue] = useState<PaymentGateway>(currentDefault)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await updateGlobalGateway(value)
            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' })
                return
            }
            toast({ title: 'Success', description: 'Global platform gateway updated successfully.' })
        } catch {
            toast({ title: 'Error', description: 'Failed to update platform setting.', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <CardTitle>Platform Default Payment Gateway</CardTitle>
                </div>
                <CardDescription>
                    This setting defines which payment provider is used by default across the entire platform.
                    Individual providers can still override this in their own settings.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="max-w-md space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                                Select Active Gateway
                            </Label>
                            <Select value={value} onValueChange={(v) => setValue(v as PaymentGateway)}>
                                <SelectTrigger className="h-12 border-primary/20 bg-background text-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OPAY" className="py-3 text-lg">OPay</SelectItem>
                                    <SelectItem value="PAYSTACK" className="py-3 text-lg">Paystack (Recommended)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-md border border-primary/10 bg-white/50 p-4 text-sm text-text-secondary">
                            <p>
                                <strong>Note:</strong> Changing this will immediately affect all bookings for providers
                                using the "Platform Default" setting.
                            </p>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="h-12 w-full text-lg shadow-lg"
                        disabled={loading || value === currentDefault}
                    >
                        {loading ? 'Updating Platform Configuration...' : 'Save Platform Default'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
