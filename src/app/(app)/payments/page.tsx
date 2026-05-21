import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { hasRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { convertToW } from '@/lib/currency'
import { getLatestRates } from '@/lib/currency.server'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { PaymentDirectionBadge } from '@/components/status-badge'
import { TableEmpty } from '@/components/empty-state'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const session = await requireSession()
  const canSeeCosts = hasRole(session.user.role, Role.MANAGER)

  const [payments, rates] = await Promise.all([
    prisma.payment.findMany({
      where: canSeeCosts ? {} : { direction: 'RECEIVED' },
      include: {
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' },
      take: 500,
    }),
    getLatestRates(),
  ])

  return (
    <>
      <PageHeader
        title="Payments"
        description={
          canSeeCosts ? 'All payments received from clients and made to suppliers' : 'Payments received from clients'
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {canSeeCosts && <TableHead>Direction</TableHead>}
              <TableHead>{canSeeCosts ? 'Party' : 'Client'}</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">In W</TableHead>
              <TableHead>Recorded by</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 && <TableEmpty colSpan={canSeeCosts ? 7 : 6} title="No payments yet" />}
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.paymentDate)}</TableCell>
                {canSeeCosts && (
                  <TableCell>
                    <PaymentDirectionBadge direction={p.direction} />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {p.client && (
                    <Link href={`/clients/${p.client.id}`} className="hover:underline">
                      {p.client.name}
                    </Link>
                  )}
                  {canSeeCosts && p.supplier && (
                    <Link href={`/suppliers/${p.supplier.id}`} className="hover:underline">
                      {p.supplier.name}
                    </Link>
                  )}
                </TableCell>
                <TableCell>
                  <Money amount={Number(p.amount)} currency={p.currency} />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={convertToW(Number(p.amount), p.currency, rates)} currency="W" />
                </TableCell>
                <TableCell className="text-muted-foreground">{p.recordedBy?.name ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{p.notes ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
