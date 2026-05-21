import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { hasRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import { convertToW } from '@/lib/currency'
import { getLatestRates } from '@/lib/currency.server'
import { getDailyRevenueProfit, getSalesByType } from '@/lib/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Money } from '@/components/money-display'
import { formatDate } from '@/lib/utils'
import { StatCard } from '@/components/stat-card'
import { EmptyState } from '@/components/empty-state'
import { AreaTrend } from '@/components/charts/area-trend'
import { Donut } from '@/components/charts/donut'
import { CHART_COLORS, TYPE_COLORS } from '@/components/charts/palette'
import { Currency, PhoneStatus, SimStatus } from '@prisma/client'
import Link from 'next/link'
import {
  TrendingUp,
  Smartphone,
  CreditCard,
  Package,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  ArrowRight,
  LineChart,
  PieChart,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await requireSession()
  const canSeeCosts = hasRole(session.user.role, Role.MANAGER)
  const rates = await getLatestRates()

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [
    phonesAvail,
    simsAvail,
    accessories,
    phonesSold,
    simsSold,
    recentImports,
    recentExports,
    lowStockAccessories,
    ratesRows,
    dailySeries,
    salesByType,
  ] = await Promise.all([
    prisma.phone.findMany({ where: { status: PhoneStatus.AVAILABLE } }),
    prisma.simCard.findMany({ where: { status: SimStatus.AVAILABLE } }),
    prisma.accessory.findMany(),
    prisma.phone.count({ where: { status: PhoneStatus.SOLD } }),
    prisma.simCard.count({ where: { status: SimStatus.SOLD } }),
    canSeeCosts
      ? prisma.import.findMany({ orderBy: { importDate: 'desc' }, take: 5, include: { supplier: true, items: true } })
      : Promise.resolve([] as any[]),
    prisma.export.findMany({ orderBy: { exportDate: 'desc' }, take: 5, include: { client: true, items: true } }),
    prisma.accessory.findMany({ where: { boxesInStock: { lte: 2 } }, orderBy: { boxesInStock: 'asc' }, take: 5 }),
    prisma.currencyRate.findMany({ orderBy: { effectiveAt: 'desc' }, take: 10 }),
    getDailyRevenueProfit(thirtyDaysAgo, now, rates),
    getSalesByType(thirtyDaysAgo, now, rates),
  ])

  const salesDonut = salesByType
    .filter((s) => s.revenueW > 0)
    .map((s) => ({ name: s.type, value: Math.round(s.revenueW), color: TYPE_COLORS[s.type] }))
  const hasSales = salesDonut.length > 0

  const stockValueW = canSeeCosts
    ? phonesAvail.reduce((s, p) => s + convertToW(Number(p.purchasePrice), p.purchaseCurrency, rates), 0) +
      simsAvail.reduce((s, p) => s + convertToW(Number(p.purchasePrice), p.purchaseCurrency, rates), 0) +
      accessories.reduce(
        (s, a) => s + convertToW(Number(a.purchasePricePerBox), a.purchaseCurrency, rates) * a.boxesInStock,
        0,
      )
    : 0

  const seen = new Set<Currency>()
  const latestRates = ratesRows.filter((r) => {
    if (seen.has(r.code)) return false
    seen.add(r.code)
    return true
  })

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of stock, recent activity, and currency rates" />

      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${canSeeCosts ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 mb-6`}
      >
        {canSeeCosts && (
          <StatCard
            icon={TrendingUp}
            tone="default"
            label="Total stock value"
            value={<Money amount={stockValueW} currency="W" />}
            hint={`${accessories.length} accessory types tracked`}
          />
        )}
        <StatCard
          icon={Smartphone}
          tone="info"
          label="Phones in stock"
          value={phonesAvail.length}
          hint={`Sold lifetime: ${phonesSold}`}
        />
        <StatCard
          icon={CreditCard}
          tone="info"
          label="Sim cards in stock"
          value={simsAvail.length}
          hint={`Sold lifetime: ${simsSold}`}
        />
        <StatCard
          icon={Package}
          tone="success"
          label="Accessory boxes"
          value={accessories.reduce((s, a) => s + a.boxesInStock, 0)}
          hint={`${accessories.length} types`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="surface-hover lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" /> Last 30 days
            </CardTitle>
            <CardDescription>{canSeeCosts ? 'Revenue, cost, and profit in W' : 'Revenue in W'}</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaTrend
              data={dailySeries}
              series={
                canSeeCosts
                  ? [
                      { dataKey: 'revenueW', label: 'Revenue', color: CHART_COLORS.primary },
                      { dataKey: 'costW', label: 'Cost', color: CHART_COLORS.slate },
                      { dataKey: 'profitW', label: 'Profit', color: CHART_COLORS.emerald },
                    ]
                  : [{ dataKey: 'revenueW', label: 'Revenue', color: CHART_COLORS.primary }]
              }
            />
          </CardContent>
        </Card>

        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-rose-500" /> Sales mix (30d)
            </CardTitle>
            <CardDescription>Revenue split by item type</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSales ? (
              <Donut data={salesDonut} formatValue={(n) => `${n.toLocaleString()} W`} />
            ) : (
              <EmptyState icon={PieChart} title="No sales in window" className="py-6" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className={`grid grid-cols-1 ${canSeeCosts ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 mb-6`}>
        <Card className="surface-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" /> Currency Rates
                </CardTitle>
                <CardDescription>Latest rates relative to W</CardDescription>
              </div>
              <Link href="/currency" className="text-xs text-primary hover:underline">
                Update
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['W', 'U', 'Y'] as Currency[]).map((c) => {
              const r = c === 'W' ? null : latestRates.find((x) => x.code === c)
              const rate = c === 'W' ? 1 : r ? Number(r.rateToW) : null
              return (
                <div key={c} className="flex items-center justify-between text-sm">
                  <span className="font-mono font-semibold bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs">
                    1 {c}
                  </span>
                  <div className="text-right">
                    {rate === null ? (
                      <Badge variant="warning">Not set</Badge>
                    ) : (
                      <>
                        <span className="tabular-nums">
                          = <Money amount={rate} currency="W" />
                        </span>
                        {r?.effectiveAt && (
                          <p className="text-[10px] text-muted-foreground">{formatDate(r.effectiveAt)}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {canSeeCosts && (
          <Card className="surface-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-info" /> Recent Imports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {recentImports.length === 0 && (
                <EmptyState icon={ArrowDownToLine} title="No imports yet" className="py-6" />
              )}
              {recentImports.map((im: any) => (
                <Link
                  key={im.id}
                  href={`/imports/${im.id}`}
                  className="flex items-center justify-between rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{im.supplier?.name ?? '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(im.importDate)} - {im.items.length} items
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="surface-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-success" /> Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentExports.length === 0 && <EmptyState icon={ArrowUpFromLine} title="No sales yet" className="py-6" />}
            {recentExports.map((ex) => (
              <Link
                key={ex.id}
                href={`/exports/${ex.id}`}
                className="flex items-center justify-between rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{ex.client?.name ?? 'Walk-in'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(ex.exportDate)} - {ex.items.length} items
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {lowStockAccessories.length > 0 && (
        <Card className="surface-hover border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock Alerts
            </CardTitle>
            <CardDescription>Accessories with 2 or fewer boxes left</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lowStockAccessories.map((a) => (
              <div key={a.id} className="flex justify-between items-center rounded-md p-2 -mx-2">
                <span className="font-medium">{a.name}</span>
                <Badge variant="warning">
                  {a.boxesInStock} box{a.boxesInStock === 1 ? '' : 'es'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  )
}
