import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getLatestRates } from '@/lib/currency.server'
import { calcImportBalance } from '@/lib/balances'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { StatCard } from '@/components/stat-card'
import { TableEmpty } from '@/components/empty-state'
import { TransactionPaymentForm } from '@/components/transaction-payment-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { convertToW } from '@/lib/currency'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteButton } from './delete-button'
import { EditImportHeader } from './edit-header'
import { ImportItemsEditor } from './items-editor'
import { Calendar, Truck, User2, Receipt, Wallet, HandCoins } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ImportDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(Role.MANAGER)
  const imp = await prisma.import.findUnique({
    where: { id: (await params).id },
    include: {
      supplier: true,
      createdBy: { select: { name: true } },
      items: { include: { phone: true, simCard: true, accessory: true } },
      payments: { orderBy: { paymentDate: 'desc' }, include: { recordedBy: { select: { name: true } } } },
    },
  })
  if (!imp) notFound()
  const [rates, suppliers, accessories] = await Promise.all([
    getLatestRates(),
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.accessory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, countPerBox: true } }),
  ])

  const balance = calcImportBalance(
    {
      items: imp.items.map((it) => ({ unitCost: Number(it.unitCost), currency: it.currency, quantity: it.quantity })),
      payments: imp.payments.map((p) => ({ amount: Number(p.amount), currency: p.currency })),
    },
    rates,
  )

  return (
    <>
      <PageHeader
        title={`Import #${imp.id.slice(-6).toUpperCase()}`}
        description={imp.supplier?.name}
        actions={
          <>
            <EditImportHeader
              id={imp.id}
              suppliers={suppliers}
              current={{
                supplierId: imp.supplierId,
                importDate: imp.importDate.toISOString().slice(0, 10),
                notes: imp.notes,
              }}
            />
            <DeleteButton id={imp.id} />
          </>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <MetaItem icon={Calendar} label="Date" value={formatDate(imp.importDate)} />
          <MetaItem
            icon={Truck}
            label="Supplier"
            value={
              imp.supplier ? (
                <Link href={`/suppliers/${imp.supplier.id}`} className="hover:underline text-primary">
                  {imp.supplier.name}
                </Link>
              ) : (
                ':'
              )
            }
          />
          <MetaItem icon={Receipt} label="Total (W)" value={<Money amount={balance.totalChargedW} currency="W" />} />
          <MetaItem icon={User2} label="Recorded by" value={imp.createdBy?.name ?? ':'} />
          {imp.notes && (
            <div className="col-span-full pt-4 border-t">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
              <p>{imp.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Receipt} tone="info" label="Total cost (W)" value={<Money amount={balance.totalChargedW} />} />
        <StatCard
          icon={Wallet}
          tone="success"
          label="Paid (W)"
          value={<Money amount={balance.totalPaidW} />}
          hint={`${imp.payments.length} payment${imp.payments.length === 1 ? '' : 's'}`}
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
              <Badge variant="success">Settled</Badge>
            )
          }
          hint={
            balance.outstandingW < -0.01 ? 'overpaid' : balance.outstandingW > 0.01 ? 'you owe supplier' : undefined
          }
        />
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <ImportItemsEditor
            importId={imp.id}
            items={imp.items.map((it) => ({
              id: it.id,
              itemType: it.itemType,
              quantity: it.quantity,
              unitCost: Number(it.unitCost),
              currency: it.currency,
              phone: it.phone ? { model: it.phone.model, imei: it.phone.imei } : null,
              simCard: it.simCard ? { number: it.simCard.number } : null,
              accessory: it.accessory ? { id: it.accessory.id, name: it.accessory.name } : null,
            }))}
            accessories={accessories}
            rates={rates}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Record Payment to Supplier</CardTitle>
          <CardDescription>Track partial payments for this import</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionPaymentForm importId={imp.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments ({imp.payments.length})</CardTitle>
          <CardDescription>Payments made specifically for this import</CardDescription>
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
              {imp.payments.length === 0 && <TableEmpty colSpan={5} title="No payments yet for this import" />}
              {imp.payments.map((p) => (
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
