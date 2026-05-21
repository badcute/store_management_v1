'use client'
import { Currency } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function MoneyInput({
  label,
  amount,
  currency,
  onAmount,
  onCurrency,
  required,
  step = '0.01',
  min = '0',
  className,
  placeholder,
}: {
  label?: string
  amount: string
  currency: Currency
  onAmount: (v: string) => void
  onCurrency: (c: Currency) => void
  required?: boolean
  step?: string
  min?: string
  className?: string
  placeholder?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <Label>{label}</Label>}
      <div className="flex gap-1.5">
        <Input
          type="number"
          step={step}
          min={min}
          required={required}
          value={amount}
          placeholder={placeholder}
          onChange={(e) => onAmount(e.target.value)}
          className="flex-1"
        />
        <Select value={currency} onChange={(e) => onCurrency(e.target.value as Currency)} className="w-20">
          <option value="W">W</option>
          <option value="U">U</option>
          <option value="Y">Y</option>
        </Select>
      </div>
    </div>
  )
}
