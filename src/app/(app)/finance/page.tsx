import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { convertToW, convertBetween } from '@/lib/currency'
import { getLatestRates } from '@/lib/currency.server'
import { calcImportBalance, calcExportBalance } from '@/lib/balances'
import { getDailyRevenueProfit, getSalesByType, getCurrencyRateHistory, getStockComposition } from '@/lib/analytics'
import { Currency, ItemType, PhoneStatus, SimStatus } from '@prisma/client'
import { Money } from '@/components/money-display'
import { StatCard } from '@/components/stat-card'
import { TableEmpty } from '@/components/empty-state'
import { FinanceFilters } from './finance-filters'
import { formatDate } from '@/lib/utils'
import { AreaTrend } from '@/components/charts/area-trend'
import { Donut } from '@/components/charts/donut'
import { BarCategories } from '@/components/charts/bar-categories'
import { CHART_COLORS, TYPE_COLORS } from '@/components/charts/palette'
import Link from 'next/link'
import {
  TrendingUp,
  Wallet,
  Coins,
  ArrowDownToLine,
  Warehouse,
  HandCoins,
  Receipt,
  AlertTriangle,
  ArrowRight,
  LineChart,
  PieChart,
  BarChart3,
  Scale,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = { from?: string; to?: string; cur?: string }

export default async function FinancePage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole(Role.MANAGER)
  const rates = await getLatestRates()
  const sp = await searchParams
  const displayCurrency = (sp.cur as Currency) || 'W'
  const from = sp.from ? new Date(sp.from) : undefined
  const to = sp.to ? new Date(sp.to + 'T23:59:59') : undefined

  const dateFilter = from || to ? { exportDate: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}
  const dateFilterImp = from || to ? { importDate: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}

  // Chart windows: default to last 30 days when no explicit filter
  const chartTo = to ?? new Date()
  const chartFrom =
    from ??
    (() => {
      const d = new Date(chartTo)
      d.setDate(d.getDate() - 29)
      d.setHours(0, 0, 0, 0)
      return d
    })()

  const [
    exports,
    imports,
    phonesAvail,
    simsAvail,
    accessories,
    allExports,
    allImports,
    lowStock,
    dailySeries,
    salesByTypeData,
    rateHistory,
    stockComposition,
  ] = await Promise.all([
    prisma.export.findMany({
      where: dateFilter,
      include: { items: { include: { phone: true, simCard: true, accessory: true } } },
    }),
    prisma.import.findMany({ where: dateFilterImp, include: { items: true } }),
    prisma.phone.findMany({ where: { status: PhoneStatus.AVAILABLE } }),
    prisma.simCard.findMany({ where: { status: SimStatus.AVAILABLE } }),
    prisma.accessory.findMany(),
    prisma.export.findMany({
      include: { items: true, payments: true, client: { select: { id: true, name: true } } },
      orderBy: { exportDate: 'desc' },
    }),
    prisma.import.findMany({
      include: { items: true, payments: true, supplier: { select: { id: true, name: true } } },
      orderBy: { importDate: 'desc' },
    }),
    prisma.accessory.findMany({ where: { boxesInStock: { lte: 2 } } }),
    getDailyRevenueProfit(chartFrom, chartTo, rates),
    getSalesByType(chartFrom, chartTo, rates),
    getCurrencyRateHistory(chartFrom, chartTo),
    getStockComposition(rates),
  ])

  let revenueW = 0,
    costOfGoodsW = 0
  const byType: Record<ItemType, { revenueW: number; costW: number; count: number }> = {
    PHONE: { revenueW: 0, costW: 0, count: 0 },
    SIM: { revenueW: 0, costW: 0, count: 0 },
    ACCESSORY: { revenueW: 0, costW: 0, count: 0 },
  }
  for (const ex of exports) {
    for (const it of ex.items) {
      const revW = convertToW(Number(it.unitPrice), it.currency, rates) * it.quantity
      revenueW += revW
      byType[it.itemType].revenueW += revW
      byType[it.itemType].count += it.quantity
      let cost = 0
      if (it.phone) cost = convertToW(Number(it.phone.purchasePrice), it.phone.purchaseCurrency, rates)
      else if (it.simCard) cost = convertToW(Number(it.simCard.purchasePrice), it.simCard.purchaseCurrency, rates)
      else if (it.accessory)
        cost = convertToW(Number(it.accessory.purchasePricePerBox), it.accessory.purchaseCurrency, rates) * it.quantity
      costOfGoodsW += cost
      byType[it.itemType].costW += cost
    }
  }
  const profitW = revenueW - costOfGoodsW

  let importSpendW = 0
  for (const im of imports)
    for (const it of im.items) importSpendW += convertToW(Number(it.unitCost), it.currency, rates) * it.quantity

  const stockValueW =
    phonesAvail.reduce((s, p) => s + convertToW(Number(p.purchasePrice), p.purchaseCurrency, rates), 0) +
    simsAvail.reduce((s, p) => s + convertToW(Number(p.purchasePrice), p.purchaseCurrency, rates), 0) +
    accessories.reduce(
      (s, a) => s + convertToW(Number(a.purchasePricePerBox), a.purchaseCurrency, rates) * a.boxesInStock,
      0,
    )

  // Per-transaction outstanding
  type Outstanding = {
    id: string
    date: Date
    party: { id: string; name: string } | null
    totalW: number
    paidW: number
    outstandingW: number
  }
  const receivables: Outstanding[] = allExports
    .map((ex) => {
      const b = calcExportBalance(
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
      return {
        id: ex.id,
        date: ex.exportDate,
        party: ex.client,
        totalW: b.totalChargedW,
        paidW: b.totalPaidW,
        outstandingW: b.outstandingW,
      }
    })
    .filter((r) => r.outstandingW > 0.01)
    .sort((a, b) => b.outstandingW - a.outstandingW)
  const payables: Outstanding[] = allImports
    .map((im) => {
      const b = calcImportBalance(
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
      return {
        id: im.id,
        date: im.importDate,
        party: im.supplier,
        totalW: b.totalChargedW,
        paidW: b.totalPaidW,
        outstandingW: b.outstandingW,
      }
    })
    .filter((r) => r.outstandingW > 0.01)
    .sort((a, b) => b.outstandingW - a.outstandingW)

  const arW = receivables.reduce((s, r) => s + r.outstandingW, 0)
  const apW = payables.reduce((s, r) => s + r.outstandingW, 0)

  const toDisp = (w: number) => convertBetween(w, 'W', displayCurrency, rates)

  // Convert daily series + sales-by-type to display currency for the charts
  const trendData = dailySeries.map((d) => ({
    date: d.date,
    revenueW: toDisp(d.revenueW),
    costW: toDisp(d.costW),
    profitW: toDisp(d.profitW),
  }))
  const salesDonut = salesByTypeData
    .filter((s) => s.revenueW > 0)
    .map((s) => ({ name: s.type, value: Math.round(toDisp(s.revenueW)), color: TYPE_COLORS[s.type] }))
  const stockDonut = stockComposition
    .filter((s) => s.valueW > 0)
    .map((s) => ({ name: s.type, value: Math.round(toDisp(s.valueW)), color: TYPE_COLORS[s.type] }))
  const arApBar = [
    { category: 'Receivables', value: Math.round(toDisp(arW)), color: CHART_COLORS.amber },
    { category: 'Payables', value: Math.round(toDisp(apW)), color: CHART_COLORS.red },
  ]
  const hasRateHistory = rateHistory.some((p) => p.U !== null || p.Y !== null)

  return (
    <>
      <PageHeader title="Finance & Reports" description="Revenue, profit, stock value, and outstanding balances" />
      <FinanceFilters from={sp.from} to={sp.to} cur={displayCurrency} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={TrendingUp}
          tone="success"
          label={`Revenue (${displayCurrency})`}
          value={<Money amount={toDisp(revenueW)} />}
        />
        <StatCard
          icon={ArrowDownToLine}
          tone="info"
          label={`Cost of goods (${displayCurrency})`}
          value={<Money amount={toDisp(costOfGoodsW)} />}
        />
        <StatCard
          icon={Wallet}
          tone={profitW >= 0 ? 'success' : 'destructive'}
          label={`Profit (${displayCurrency})`}
          value={<Money amount={toDisp(profitW)} emphasis={profitW >= 0 ? 'success' : 'danger'} />}
        />
        <StatCard
          icon={Receipt}
          tone="info"
          label={`Import spend (${displayCurrency})`}
          value={<Money amount={toDisp(importSpendW)} />}
        />
        <StatCard
          icon={Warehouse}
          tone="default"
          label={`Stock value (${displayCurrency})`}
          value={<Money amount={toDisp(stockValueW)} />}
        />
        <StatCard
          icon={HandCoins}
          tone={arW > 0.01 ? 'warning' : 'success'}
          label={`Receivables (${displayCurrency})`}
          value={<Money amount={toDisp(arW)} />}
          hint={`${receivables.length} unpaid invoice${receivables.length === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={Coins}
          tone={apW > 0.01 ? 'destructive' : 'success'}
          label={`Payables (${displayCurrency})`}
          value={<Money amount={toDisp(apW)} />}
          hint={`${payables.length} unpaid import${payables.length === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? 'warning' : 'success'}
          label="Low stock alerts"
          value={lowStock.length}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="surface-hover xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" /> Revenue, Cost &amp; Profit
            </CardTitle>
            <CardDescription>{`Daily values in ${displayCurrency}`}</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaTrend
              data={trendData}
              series={[
                { dataKey: 'revenueW', label: 'Revenue', color: CHART_COLORS.primary },
                { dataKey: 'costW', label: 'Cost', color: CHART_COLORS.slate },
                { dataKey: 'profitW', label: 'Profit', color: CHART_COLORS.emerald },
              ]}
              height={280}
            />
          </CardContent>
        </Card>

        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-rose-500" /> Sales mix
            </CardTitle>
            <CardDescription>Revenue by item type</CardDescription>
          </CardHeader>
          <CardContent>
            {salesDonut.length > 0 ? (
              <Donut data={salesDonut} height={260} formatValue={(n) => `${n.toLocaleString()} ${displayCurrency}`} />
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12">No sales in window</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-amber-600" /> Outstanding A/R vs A/P
            </CardTitle>
            <CardDescription>{`Totals in ${displayCurrency}`}</CardDescription>
          </CardHeader>
          <CardContent>
            <BarCategories
              data={arApBar}
              series={[{ dataKey: 'value', label: 'Amount', color: CHART_COLORS.primary }]}
              height={220}
              layout="vertical"
            />
          </CardContent>
        </Card>

        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-info" /> Currency rate history
            </CardTitle>
            <CardDescription>U &amp; Y rates against W</CardDescription>
          </CardHeader>
          <CardContent>
            {hasRateHistory ? (
              <AreaTrend
                data={rateHistory}
                series={[
                  { dataKey: 'U', label: 'U / W', color: CHART_COLORS.sky },
                  { dataKey: 'Y', label: 'Y / W', color: CHART_COLORS.violet },
                ]}
                height={220}
              />
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12">No rate updates in window</div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" /> Stock composition
            </CardTitle>
            <CardDescription>Current value by type</CardDescription>
          </CardHeader>
          <CardContent>
            {stockDonut.length > 0 ? (
              <Donut
                data={stockDonut}
                height={220}
                innerRadius={50}
                outerRadius={80}
                formatValue={(n) => `${n.toLocaleString()} ${displayCurrency}`}
              />
            ) : (
              <div className="text-center text-muted-foreground text-sm py-12">No stock</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 surface-hover">
        <CardHeader>
          <CardTitle>By Product Type</CardTitle>
          <CardDescription>Sales in selected window</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Revenue ({displayCurrency})</TableHead>
                <TableHead className="text-right">Cost ({displayCurrency})</TableHead>
                <TableHead className="text-right">Profit ({displayCurrency})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byType).map(([t, v]) => {
                const profit = v.revenueW - v.costW
                return (
                  <TableRow key={t}>
                    <TableCell>
                      <Badge variant="secondary">{t}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{v.count}</TableCell>
                    <TableCell className="text-right">
                      <Money amount={toDisp(v.revenueW)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={toDisp(v.costW)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={toDisp(profit)} emphasis={profit >= 0 ? 'success' : 'danger'} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-amber-600" /> Outstanding Receivables
            </CardTitle>
            <CardDescription>Unpaid invoices : clients owe you</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Outstanding ({displayCurrency})</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.length === 0 && (
                  <TableEmpty colSpan={4} title="All paid up" description="No outstanding receivables." />
                )}
                {receivables.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="font-medium">
                      {r.party ? (
                        <Link href={`/clients/${r.party.id}`} className="hover:underline">
                          {r.party.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={toDisp(r.outstandingW)} emphasis="danger" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/exports/${r.id}`}
                        className="text-primary text-xs hover:underline inline-flex items-center gap-1"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-destructive" /> Outstanding Payables
            </CardTitle>
            <CardDescription>Unpaid imports : you owe suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">You owe ({displayCurrency})</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.length === 0 && (
                  <TableEmpty colSpan={4} title="All settled" description="No outstanding payables." />
                )}
                {payables.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="font-medium">
                      {r.party ? (
                        <Link href={`/suppliers/${r.party.id}`} className="hover:underline">
                          {r.party.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">:</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={toDisp(r.outstandingW)} emphasis="danger" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/imports/${r.id}`}
                        className="text-primary text-xs hover:underline inline-flex items-center gap-1"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card className="surface-hover border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock
            </CardTitle>
            <CardDescription>2 or fewer boxes left</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accessory</TableHead>
                  <TableHead className="text-right">Per box</TableHead>
                  <TableHead className="text-right">Boxes left</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.countPerBox}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning">{a.boxesInStock}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  )
}
