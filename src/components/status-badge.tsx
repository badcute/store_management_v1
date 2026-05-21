import { PhoneStatus, SimStatus, Role, PaymentDirection } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

const PHONE: Record<PhoneStatus, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
  AVAILABLE: { label: 'Available', variant: 'success' },
  SOLD: { label: 'Sold', variant: 'secondary' },
  RESERVED: { label: 'Reserved', variant: 'warning' },
  DEFECTIVE: { label: 'Defective', variant: 'destructive' },
}
const SIM: Record<SimStatus, { label: string; variant: 'success' | 'secondary' }> = {
  AVAILABLE: { label: 'Available', variant: 'success' },
  SOLD: { label: 'Sold', variant: 'secondary' },
}
const ROLE_VARIANT: Record<Role, 'default' | 'secondary' | 'info'> = {
  ADMIN: 'default',
  MANAGER: 'info',
  STAFF: 'secondary',
}

export function PhoneStatusBadge({ status }: { status: PhoneStatus }) {
  const s = PHONE[status]
  return <Badge variant={s.variant}>{s.label}</Badge>
}
export function SimStatusBadge({ status }: { status: SimStatus }) {
  const s = SIM[status]
  return <Badge variant={s.variant}>{s.label}</Badge>
}
export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>
}
export function PaymentDirectionBadge({ direction }: { direction: PaymentDirection }) {
  return (
    <Badge variant={direction === 'RECEIVED' ? 'success' : 'info'}>
      {direction === 'RECEIVED' ? 'Received' : 'Paid'}
    </Badge>
  )
}
export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge variant="success">Active</Badge> : <Badge variant="destructive">Disabled</Badge>
}
