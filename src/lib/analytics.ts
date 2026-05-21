import { prisma } from './prisma'
import { convertToW, type RateMap } from './currency'
import { Currency } from '@prisma/client'

export type DailyPoint = { date: string; revenueW: number; costW: number; profitW: number }
export type SalesByTypePoint = { type: 'PHONE' | 'SIM' | 'ACCESSORY'; units: number; revenueW: number }
export type RateHistoryPoint = { date: string; U: number | null; Y: number | null }

function startOfDayISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function eachDay(from: Date, to: Date): string[] {
  const out: string[] = []
  const cur = new Date(from)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (cur <= end) {
    out.push(startOfDayISO(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export async function getDailyRevenueProfit(from: Date, to: Date, rates: RateMap): Promise<DailyPoint[]> {
  const exports = await prisma.export.findMany({
    where: { exportDate: { gte: from, lte: to } },
    include: { items: { include: { phone: true, simCard: true, accessory: true } } },
  })

  const bucket = new Map<string, DailyPoint>()
  for (const key of eachDay(from, to)) {
    bucket.set(key, { date: key, revenueW: 0, costW: 0, profitW: 0 })
  }

  for (const ex of exports) {
    const key = startOfDayISO(ex.exportDate)
    const row = bucket.get(key)
    if (!row) continue
    for (const it of ex.items) {
      const rev = convertToW(Number(it.unitPrice), it.currency, rates) * it.quantity
      row.revenueW += rev
      let cost = 0
      if (it.phone) cost = convertToW(Number(it.phone.purchasePrice), it.phone.purchaseCurrency, rates)
      else if (it.simCard) cost = convertToW(Number(it.simCard.purchasePrice), it.simCard.purchaseCurrency, rates)
      else if (it.accessory)
        cost = convertToW(Number(it.accessory.purchasePricePerBox), it.accessory.purchaseCurrency, rates) * it.quantity
      row.costW += cost
    }
    row.profitW = row.revenueW - row.costW
  }
  return Array.from(bucket.values())
}

export async function getSalesByType(from: Date, to: Date, rates: RateMap): Promise<SalesByTypePoint[]> {
  const items = await prisma.exportItem.findMany({
    where: { export: { exportDate: { gte: from, lte: to } } },
  })
  const acc: Record<'PHONE' | 'SIM' | 'ACCESSORY', SalesByTypePoint> = {
    PHONE: { type: 'PHONE', units: 0, revenueW: 0 },
    SIM: { type: 'SIM', units: 0, revenueW: 0 },
    ACCESSORY: { type: 'ACCESSORY', units: 0, revenueW: 0 },
  }
  for (const it of items) {
    const target = acc[it.itemType]
    target.units += it.quantity
    target.revenueW += convertToW(Number(it.unitPrice), it.currency, rates) * it.quantity
  }
  return Object.values(acc)
}

export async function getCurrencyRateHistory(from: Date, to: Date): Promise<RateHistoryPoint[]> {
  const rows = await prisma.currencyRate.findMany({
    where: { effectiveAt: { gte: from, lte: to } },
    orderBy: { effectiveAt: 'asc' },
  })
  if (rows.length === 0) {
    // fall back to latest few of each
    const latest = await prisma.currencyRate.findMany({
      where: { code: { in: [Currency.U, Currency.Y] } },
      orderBy: { effectiveAt: 'desc' },
      take: 20,
    })
    rows.push(...latest.reverse())
  }
  const map = new Map<string, RateHistoryPoint>()
  for (const r of rows) {
    const key = startOfDayISO(r.effectiveAt)
    const existing = map.get(key) ?? { date: key, U: null, Y: null }
    if (r.code === 'U') existing.U = Number(r.rateToW)
    if (r.code === 'Y') existing.Y = Number(r.rateToW)
    map.set(key, existing)
  }
  // Forward-fill nulls so the line is continuous between updates.
  const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  let lastU: number | null = null
  let lastY: number | null = null
  for (const p of sorted) {
    if (p.U !== null) lastU = p.U
    else p.U = lastU
    if (p.Y !== null) lastY = p.Y
    else p.Y = lastY
  }
  return sorted
}

export type StockComposition = { type: 'PHONE' | 'SIM' | 'ACCESSORY'; valueW: number; count: number }

export async function getStockComposition(rates: RateMap): Promise<StockComposition[]> {
  const [phones, sims, accessories] = await Promise.all([
    prisma.phone.findMany({ where: { status: 'AVAILABLE' } }),
    prisma.simCard.findMany({ where: { status: 'AVAILABLE' } }),
    prisma.accessory.findMany(),
  ])
  return [
    {
      type: 'PHONE',
      count: phones.length,
      valueW: phones.reduce((s, p) => s + convertToW(Number(p.purchasePrice), p.purchaseCurrency, rates), 0),
    },
    {
      type: 'SIM',
      count: sims.length,
      valueW: sims.reduce((s, p) => s + convertToW(Number(p.purchasePrice), p.purchaseCurrency, rates), 0),
    },
    {
      type: 'ACCESSORY',
      count: accessories.reduce((s, a) => s + a.boxesInStock, 0),
      valueW: accessories.reduce(
        (s, a) => s + convertToW(Number(a.purchasePricePerBox), a.purchaseCurrency, rates) * a.boxesInStock,
        0,
      ),
    },
  ]
}

export type ARAPTotals = { receivableW: number; payableW: number }

export async function getARAPTotals(rates: RateMap): Promise<ARAPTotals> {
  const [clients, suppliers] = await Promise.all([
    prisma.client.findMany({ include: { exports: { include: { items: true } }, payments: true } }),
    prisma.supplier.findMany({ include: { imports: { include: { items: true } }, payments: true } }),
  ])

  let receivableW = 0
  for (const c of clients) {
    const charged = c.exports.reduce(
      (s, ex) =>
        s + ex.items.reduce((a, it) => a + convertToW(Number(it.unitPrice), it.currency, rates) * it.quantity, 0),
      0,
    )
    const paid = c.payments.reduce((s, p) => s + convertToW(Number(p.amount), p.currency, rates), 0)
    receivableW += Math.max(0, charged - paid)
  }
  let payableW = 0
  for (const sup of suppliers) {
    const charged = sup.imports.reduce(
      (s, im) =>
        s + im.items.reduce((a, it) => a + convertToW(Number(it.unitCost), it.currency, rates) * it.quantity, 0),
      0,
    )
    const paid = sup.payments.reduce((s, p) => s + convertToW(Number(p.amount), p.currency, rates), 0)
    payableW += Math.max(0, charged - paid)
  }
  return { receivableW, payableW }
}
