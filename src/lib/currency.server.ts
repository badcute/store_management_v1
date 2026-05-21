import 'server-only'
import { Currency } from '@prisma/client'
import { prisma } from './prisma'
import type { RateMap } from './currency'

/**
 * Returns map of currency -> latest rate-to-W. W is always 1.
 * If no rate row exists for a currency, defaults to 1 (caller can warn).
 */
export async function getLatestRates(): Promise<RateMap> {
  const rows = await prisma.currencyRate.findMany({
    orderBy: { effectiveAt: 'desc' },
  })
  const out: RateMap = { W: 1, U: 1, Y: 1 }
  const seen = new Set<Currency>()
  for (const r of rows) {
    if (seen.has(r.code)) continue
    seen.add(r.code)
    out[r.code] = Number(r.rateToW)
  }
  out.W = 1
  return out
}
