import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getLatestRates } from '@/lib/currency.server'
import { calcExportBalance } from '@/lib/balances'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { BalanceCell } from '@/components/balance-cell'
import { TableEmpty } from '@/components/empty-state'
import { ClickableRow } from '@/components/clickable-row'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExportsPage() {
  const [exps, rates] = await Promise.all([
    prisma.export.findMany({
      include: {
        client: { select: { id: true, name: true } },
        items: true,
        payments: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { exportDate: 'desc' },
      take: 200,
    }),
    getLatestRates(),
  ])

  return (
    <>
      <PageHeader
        title="Exports / Sales"
        description="Goods sold to clients"
        actions={
          <Link href="/exports/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New sale
            </Button>
          </Link>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total (W)</TableHead>
              <TableHead className="text-right">Paid (W)</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exps.length === 0 && (
              <TableEmpty colSpan={6} title="No sales yet" description="Record your first sale to get started." />
            )}
            {exps.map((ex) => {
              const balance = calcExportBalance(
                {
                  items: ex.items.map((it) => ({
                    unitPrice: Number(it.unitPrice),
                    currency: it.currency,
                    quantity: it.quantity,
                  })),
                  payments: ex.payments.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
                },
                rates,
              )
              const typeCounts = ex.items.reduce(
                (acc, it) => ({ ...acc, [it.itemType]: (acc[it.itemType] ?? 0) + it.quantity }),
                {} as Record<string, number>,
              )
              return (
                <ClickableRow key={ex.id} href={`/exports/${ex.id}`}>
                  <TableCell>{formatDate(ex.exportDate)}</TableCell>
                  <TableCell className="font-medium">
                    {ex.client ? (
                      <Link href={`/clients/${ex.client.id}`} className="hover:underline">
                        {ex.client.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Walk-in</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1">
                    {Object.entries(typeCounts).map(([t, q]) => (
                      <Badge key={t} variant="secondary">
                        {q} {t.toLowerCase()}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={balance.totalChargedW} currency="W" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={balance.totalPaidW} currency="W" />
                  </TableCell>
                  <TableCell className="text-right">
                    <BalanceCell amountW={balance.outstandingW} />
                  </TableCell>
                </ClickableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
