import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { convertToW } from '@/lib/currency'
import { getLatestRates } from '@/lib/currency.server'
import { calcExportBalance } from '@/lib/balances'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { StatCard } from '@/components/stat-card'
import { TableEmpty } from '@/components/empty-state'
import { TransactionPaymentForm } from '@/components/transaction-payment-form'
import { PhoneStatus, SimStatus } from '@prisma/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteButton } from './delete-button'
import { EditExportHeader } from './edit-header'
import { ExportItemsEditor } from './items-editor'
import { Calendar, User, User2, Receipt, Wallet, HandCoins } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExportDetail({ params }: { params: Promise<{ id: string }> }) {
  const ex = await prisma.export.findUnique({
    where: { id: (await params).id },
    include: {
      client: true,
      createdBy: { select: { name: true } },
      items: { include: { phone: true, simCard: true, accessory: true } },
      payments: { orderBy: { paymentDate: 'desc' }, include: { recordedBy: { select: { name: true } } } },
    },
  })
  if (!ex) notFound()
  const [rates, clients, availPhones, availSims, accessories] = await Promise.all([
    getLatestRates(),
    prisma.client.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.phone.findMany({ where: { status: PhoneStatus.AVAILABLE }, orderBy: { createdAt: 'desc' } }),
    prisma.simCard.findMany({ where: { status: SimStatus.AVAILABLE }, orderBy: { createdAt: 'desc' } }),
    prisma.accessory.findMany({ where: { boxesInStock: { gt: 0 } }, orderBy: { name: 'asc' } }),
  ])
  const balance = calcExportBalance(
    {
      items: ex.items.map((it) => ({ unitPrice: Number(it.unitPrice), currency: it.currency, quantity: it.quantity })),
      payments: ex.payments.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
    },
    rates,
  )

  const totals: Record<string, number> = { W: 0, U: 0, Y: 0 }
  for (const it of ex.items) totals[it.currency] = (totals[it.currency] ?? 0) + Number(it.unitPrice) * it.quantity

  return (
    <>
      <PageHeader
        title={`Invoice #${ex.id.slice(-6).toUpperCase()}`}
        description={ex.client?.name || 'Walk-in client'}
        actions={
          <>
            <EditExportHeader
              id={ex.id}
              clients={clients}
              current={{ clientId: ex.clientId, exportDate: ex.exportDate.toISOString().slice(0, 10), notes: ex.notes }}
            />
            <DeleteButton id={ex.id} />
          </>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <MetaItem icon={Calendar} label="Date" value={formatDate(ex.exportDate)} />
          <MetaItem
            icon={User}
            label="Client"
            value={
              ex.client ? (
                <Link href={`/clients/${ex.client.id}`} className="hover:underline text-primary">
                  {ex.client.name}
                </Link>
              ) : (
                'Walk-in'
              )
            }
          />
          <MetaItem icon={Receipt} label="Total (W)" value={<Money amount={balance.totalChargedW} currency="W" />} />
          <MetaItem icon={User2} label="Recorded by" value={ex.createdBy?.name ?? ':'} />
          {ex.notes && (
            <div className="col-span-full pt-4 border-t">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p>{ex.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Receipt} tone="info" label="Total sale (W)" value={<Money amount={balance.totalChargedW} />} />
        <StatCard
          icon={Wallet}
          tone="success"
          label="Paid (W)"
          value={<Money amount={balance.totalPaidW} />}
          hint={`${ex.payments.length} payment${ex.payments.length === 1 ? '' : 's'}`}
        />
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
              <Badge variant="success">Paid in full</Badge>
            )
          }
          hint={balance.outstandingW < -0.01 ? 'overpaid' : balance.outstandingW > 0.01 ? 'client owes' : undefined}
        />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <ExportItemsEditor
            exportId={ex.id}
            items={ex.items.map((it) => ({
              id: it.id,
              itemType: it.itemType,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
              currency: it.currency,
              phone: it.phone ? { id: it.phone.id, model: it.phone.model, imei: it.phone.imei } : null,
              simCard: it.simCard ? { id: it.simCard.id, number: it.simCard.number } : null,
              accessory: it.accessory ? { id: it.accessory.id, name: it.accessory.name } : null,
            }))}
            phones={availPhones.map((p) => ({
              id: p.id,
              model: p.model,
              imei: p.imei,
              sellingPrice: p.sellingPrice == null ? null : Number(p.sellingPrice),
              sellingCurrency: p.sellingCurrency,
            }))}
            sims={availSims.map((s) => ({
              id: s.id,
              number: s.number,
              sellingPrice: s.sellingPrice == null ? null : Number(s.sellingPrice),
              sellingCurrency: s.sellingCurrency,
            }))}
            accessories={accessories.map((a) => ({
              id: a.id,
              name: a.name,
              boxesInStock: a.boxesInStock,
              sellingPricePerBox: a.sellingPricePerBox == null ? null : Number(a.sellingPricePerBox),
              sellingCurrency: a.sellingCurrency,
            }))}
            rates={rates}
          />
          <div className="mt-4 flex justify-end text-sm">
            <div className="text-right space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Totals</p>
              {Object.entries(totals)
                .filter(([, v]) => v > 0)
                .map(([c, v]) => (
                  <p key={c}>
                    <Money amount={v} currency={c} />
                  </p>
                ))}
              <p className="font-semibold border-t pt-1 mt-1">
                <Money amount={balance.totalChargedW} currency="W" />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record Payment from Client</CardTitle>
          <CardDescription>Track partial payments for this sale</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionPaymentForm exportId={ex.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments ({ex.payments.length})</CardTitle>
          <CardDescription>Payments received specifically for this sale</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">In W</TableHead>
                <TableHead>Recorded by</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ex.payments.length === 0 && <TableEmpty colSpan={5} title="No payments yet for this sale" />}
              {ex.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paymentDate)}</TableCell>
                  <TableCell>
                    <Money amount={Number(p.amount)} currency={p.currency} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={convertToW(Number(p.amount), p.currency, rates)} currency="W" />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.recordedBy?.name ?? ':'}</TableCell>
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

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  )
}
