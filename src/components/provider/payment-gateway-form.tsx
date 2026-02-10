'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { updateProviderPaymentGatewayAction } from '@/actions/payment-config'
import { useToast } from '@/hooks/use-toast'
import { PaymentGateway } from '@prisma/client'

type GatewayOption = 'DEFAULT' | PaymentGateway

interface PaymentGatewayFormProps {
  providerId: string
  effectiveGateway: PaymentGateway
  globalDefault: PaymentGateway
  providerOverride: PaymentGateway | null
}

export function PaymentGatewayForm({
  providerId,
  effectiveGateway,
  globalDefault,
  providerOverride,
}: PaymentGatewayFormProps) {
  const { toast } = useToast()
  const [value, setValue] = useState<GatewayOption>(providerOverride ?? 'DEFAULT')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const gateway = value === 'DEFAULT' ? null : value
      const result = await updateProviderPaymentGatewayAction(providerId, gateway)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Saved', description: 'Payment gateway preference updated.' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update setting.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment gateway</CardTitle>
        <CardDescription>
          Choose which payment provider to use for this business. Current: <strong>{effectiveGateway}</strong>
          {providerOverride ? ` (overriding platform default: ${globalDefault})` : ` (platform default: ${globalDefault})`}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Gateway</Label>
            <Select value={value} onValueChange={(v) => setValue(v as GatewayOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Use platform default ({globalDefault})</SelectItem>
                <SelectItem value="OPAY">OPay</SelectItem>
                <SelectItem value="PAYSTACK">Paystack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
