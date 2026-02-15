'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { updateProviderPaymentGatewayAction, updateGlobalPaymentGatewayAction } from '@/actions/payment-config'
import { useToast } from '@/hooks/use-toast'
import { PaymentGateway } from '@prisma/client'

type GatewayOption = 'DEFAULT' | PaymentGateway

interface PaymentGatewayFormProps {
  providerId: string
  effectiveGateway: PaymentGateway
  globalDefault: PaymentGateway
  providerOverride: PaymentGateway | null
  isAdmin?: boolean
}

export function PaymentGatewayForm({
  providerId,
  effectiveGateway,
  globalDefault,
  providerOverride,
  isAdmin = false,
}: PaymentGatewayFormProps) {
  const { toast } = useToast()
  const [value, setValue] = useState<GatewayOption>(providerOverride ?? 'DEFAULT')
  const [globalValue, setGlobalValue] = useState<PaymentGateway>(globalDefault)
  const [loading, setLoading] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(false)

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

  const handleGlobalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalLoading(true)
    try {
      const result = await updateGlobalPaymentGatewayAction(globalValue)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Saved', description: 'Global payment gateway updated.' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update global setting.', variant: 'destructive' })
    } finally {
      setGlobalLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Provider Payment Gateway</CardTitle>
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
              {loading ? 'Saving…' : 'Save Provider Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle>Super Admin: Global Default</CardTitle>
            <CardDescription>
              Set the default payment gateway for ALL new providers who haven't overridden it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGlobalSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Global Default Gateway</Label>
                <Select value={globalValue} onValueChange={(v) => setGlobalValue(v as PaymentGateway)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPAY">OPay</SelectItem>
                    <SelectItem value="PAYSTACK">Paystack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="destructive" disabled={globalLoading}>
                {globalLoading ? 'Updating Global Default…' : 'Update Global Default'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
