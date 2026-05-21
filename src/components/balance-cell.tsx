import { Badge } from '@/components/ui/badge'
import { Money } from '@/components/money-display'

export function BalanceCell({ amountW, owe = 'they' }: { amountW: number; owe?: 'they' | 'you' }) {
  if (amountW > 0.01) {
    return (
      <Badge variant="warning">
        <Money amount={amountW} currency="W" />
      </Badge>
    )
  }
  if (amountW < -0.01) {
    return (
      <Badge variant="success">
        overpaid <Money amount={Math.abs(amountW)} currency="W" className="ml-1" />
      </Badge>
    )
  }
  return <Badge variant="success">Settled</Badge>
}
