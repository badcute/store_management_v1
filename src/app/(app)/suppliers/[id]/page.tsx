import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { convertToW } from '@/lib/currency'
import { getLatestRates } from '@/lib/currency.server'
import { getSupplierBalance } from '@/lib/balances'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { StatCard } from '@/components/stat-card'
import { TableEmpty } from '@/components/empty-state'
import { notFound } from 'next/navigation'
import { PaymentForm } from '@/app/(app)/clients/[id]/payment-form'
import Link from 'next/link'
import { Coins, Wallet, ArrowDownToLine, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SupplierDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(Role.MANAGER)
  const supplier = await prisma.supplier.findUnique({
    where: { id: (await params).id },
    include: {
      imports: { include: { items: true }, orderBy: { importDate: 'desc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  })
  if (!supplier) notFound()
  const rates = await getLatestRates()
  const balance = await getSupplierBalance(supplier.id, rates)

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={[supplier.phone, supplier.email].filter(Boolean).join(' â€¢ ') || 'Supplier details'}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={ArrowDownToLine}
          tone="info"
          label="Total supplied (W)"
          value={<Money amount={balance.totalChargedW} />}
        />
        <StatCard icon={Wallet} tone="success" label="Total paid (W)" value={<Money amount={balance.totalPaidW} />} />
        <StatCard
          icon={Coins}
          tone={balance.outstandingW > 0.01 ? 'warning' : 'success'}
          label="You owe (W)"
          value={
            balance.outstandingW > 0.01 ? (
              <Money amount={balance.outstandingW} emphasis="danger" />
            ) : balance.outstandingW < -0.01 ? (
              <Money amount={Math.abs(balance.outstandingW)} emphasis="success" />
            ) : (
              <Badge variant="success">Settled</Badge>
            )
          }
          hint={balance.outstandingW < -0.01 ? 'overpaid' : undefined}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record Payment Made</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentForm supplierId={supplier.id} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Supply History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total (W)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.imports.length === 0 && <TableEmpty colSpan={4} title="No imports yet" />}
              {supplier.imports.map((im) => {
                const totalW = im.items.reduce(
                  (s, it) => s + convertToW(Number(it.unitCost), it.currency, rates) * it.quantity,
                  0,
                )
                return (
                  <TableRow key={im.id}>
                    <TableCell>{formatDate(im.importDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{im.items.length}</TableCell>
                    <TableCell className="text-right">
                      <Money amount={totalW} currency="W" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/imports/${im.id}`}
                        className="text-primary text-xs hover:underline inline-flex items-center gap-1"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments Made</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">In W</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.payments.length === 0 && <TableEmpty colSpan={4} title="No payments recorded" />}
              {supplier.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paymentDate)}</TableCell>
                  <TableCell>
                    <Money amount={Number(p.amount)} currency={p.currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={convertToW(Number(p.amount), p.currency, rates)} currency="W" />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p.notes ?? ':'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
