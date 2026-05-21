import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/utils'

export function Money({
  amount,
  currency,
  muted,
  emphasis,
  className,
}: {
  amount: number | string | null | undefined
  currency?: string | null
  muted?: boolean
  emphasis?: 'success' | 'danger' | 'neutral'
  className?: string
}) {
  if (amount === null || amount === undefined || amount === '') return <span className="text-muted-foreground">:</span>
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(n)) return <span className="text-muted-foreground">:</span>
  return (
    <span
      className={cn(
        'tabular-nums',
        muted && 'text-muted-foreground',
        emphasis === 'success' && 'text-success font-medium',
        emphasis === 'danger' && 'text-destructive font-medium',
        className,
      )}
    >
      <span>{n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
      {currency && <span className="ml-1 text-xs text-muted-foreground font-normal">{currency}</span>}
    </span>
  )
}

export { formatMoney }
