import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { convertToW } from '@/lib/currency'
import { getLatestRates } from '@/lib/currency.server'
import { getClientBalance } from '@/lib/balances'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { StatCard } from '@/components/stat-card'
import { TableEmpty } from '@/components/empty-state'
import { notFound } from 'next/navigation'
import { PaymentForm } from './payment-form'
import Link from 'next/link'
import { HandCoins, Receipt, Wallet, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await prisma.client.findUnique({
    where: { id: (await params).id },
    include: {
      exports: { include: { items: true }, orderBy: { exportDate: 'desc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  })
  if (!client) notFound()
  const rates = await getLatestRates()
  const balance = await getClientBalance(client.id, rates)

  return (
    <>
      <PageHeader
        title={client.name}
        description={[client.phone, client.email].filter(Boolean).join(' â€¢ ') || 'Client details'}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Receipt}
          tone="info"
          label="Total purchases (W)"
          value={<Money amount={balance.totalChargedW} />}
        />
        <StatCard icon={Wallet} tone="success" label="Total paid (W)" value={<Money amount={balance.totalPaidW} />} />
        <StatCard
          icon={HandCoins}
          tone={balance.outstandingW > 0.01 ? 'warning' : 'success'}
          label="Outstanding (W)"
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
          <CardTitle>Record Payment Received</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentForm clientId={client.id} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
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
              {client.exports.length === 0 && <TableEmpty colSpan={4} title="No purchases yet" />}
              {client.exports.map((ex) => {
                const totalW = ex.items.reduce(
                  (s, it) => s + convertToW(Number(it.unitPrice), it.currency, rates) * it.quantity,
                  0,
                )
                return (
                  <TableRow key={ex.id}>
                    <TableCell>{formatDate(ex.exportDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{ex.items.length}</TableCell>
                    <TableCell className="text-right">
                      <Money amount={totalW} currency="W" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/exports/${ex.id}`}
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
          <CardTitle>Payments Received</CardTitle>
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
              {client.payments.length === 0 && <TableEmpty colSpan={4} title="No payments recorded" />}
              {client.payments.map((p) => (
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
