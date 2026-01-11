'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  industries: string[]
  selectedIndustry: string | null
  onIndustryChange: (industry: string | null) => void
}

export function FilterBar({ industries, selectedIndustry, onIndustryChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedIndustry === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onIndustryChange(null)}
      >
        All
      </Button>
      {industries.map((industry) => (
        <Button
          key={industry}
          variant={selectedIndustry === industry ? 'default' : 'outline'}
          size="sm"
          onClick={() => onIndustryChange(industry)}
        >
          {industry}
        </Button>
      ))}
    </div>
  )
}
