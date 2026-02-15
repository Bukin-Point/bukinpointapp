import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
}

export function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-body-sm text-text-secondary">{title}</p>
            <p className="mt-2 text-h2 font-semibold">{value}</p>
            {trend && (
              <p className="mt-1 text-caption text-text-secondary">{trend.label}</p>
            )}
          </div>
          <div className="rounded-full bg-primary-50 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
