import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { Money } from '@/components/money-display'
import { Currency } from '@prisma/client'
import { RateForm } from './rate-form'
import { Badge } from '@/components/ui/badge'
import { TableEmpty } from '@/components/empty-state'

export const dynamic = 'force-dynamic'

export default async function CurrencyPage() {
  const rates = await prisma.currencyRate.findMany({
    orderBy: { effectiveAt: 'desc' },
    include: { updatedBy: { select: { name: true } } },
    take: 100,
  })

  const latest: Partial<Record<Currency, (typeof rates)[number]>> = {}
  for (const r of rates) if (!latest[r.code]) latest[r.code] = r

  return (
    <>
      <PageHeader
        title="Currency Rates"
        description="Update exchange rates manually. All conversions use the latest rate per currency."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(['W', 'U', 'Y'] as Currency[]).map((c) => {
          const r = latest[c]
          return (
            <Card key={c} className="surface-hover">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between">
                  <span>1 {c} equals</span>
                  {c === 'W' && <Badge variant="default">Main</Badge>}
                </CardDescription>
                <CardTitle className="text-2xl">
                  {c === 'W' ? (
                    <Money amount={1} currency="W" />
                  ) : r ? (
                    <Money amount={Number(r.rateToW)} currency="W" />
                  ) : (
                    <Badge variant="warning">not set</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {c === 'W'
                  ? 'Main currency : always 1'
                  : r
                    ? `Updated ${formatDate(r.effectiveAt)} by ${r.updatedBy?.name ?? ':'}`
                    : 'Add a rate to enable conversions'}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Update Rate</CardTitle>
          <CardDescription>Enter today's rate; previous values stay in history</CardDescription>
        </CardHeader>
        <CardContent>
          <RateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Rate to W</TableHead>
                <TableHead>Updated by</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.length === 0 && <TableEmpty colSpan={5} title="No rate updates yet" />}
              {rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.effectiveAt)}</TableCell>
                  <TableCell>
                    <Badge>{r.code}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Money amount={Number(r.rateToW)} currency="W" />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.updatedBy?.name ?? ':'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.notes ?? ':'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
