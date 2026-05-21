import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getLatestRates } from '@/lib/currency.server'
import { calcImportBalance } from '@/lib/balances'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { BalanceCell } from '@/components/balance-cell'
import { TableEmpty } from '@/components/empty-state'
import { ClickableRow } from '@/components/clickable-row'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ImportsPage() {
  await requireRole(Role.MANAGER)
  const [imports, rates] = await Promise.all([
    prisma.import.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
        payments: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { importDate: 'desc' },
      take: 200,
    }),
    getLatestRates(),
  ])

  return (
    <>
      <PageHeader
        title="Imports"
        description="Goods purchased from suppliers"
        actions={
          <Link href="/imports/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New import
            </Button>
          </Link>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total (W)</TableHead>
              <TableHead className="text-right">Paid (W)</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.length === 0 && (
              <TableEmpty
                colSpan={6}
                title="No imports yet"
                description="Click 'New import' to record your first delivery."
              />
            )}
            {imports.map((im) => {
              const balance = calcImportBalance(
                {
                  items: im.items.map((it) => ({
                    unitCost: Number(it.unitCost),
                    currency: it.currency,
                    quantity: it.quantity,
                  })),
                  payments: im.payments.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
                },
                rates,
              )
              const typeCounts = im.items.reduce(
                (acc, it) => ({ ...acc, [it.itemType]: (acc[it.itemType] ?? 0) + it.quantity }),
                {} as Record<string, number>,
              )
              return (
                <ClickableRow key={im.id} href={`/imports/${im.id}`}>
                  <TableCell>{formatDate(im.importDate)}</TableCell>
                  <TableCell className="font-medium">
                    {im.supplier ? (
                      <Link href={`/suppliers/${im.supplier.id}`} className="hover:underline">
                        {im.supplier.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
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
