import type { Currency } from '@prisma/client'

export type RateMap = Record<Currency, number>

/**
 * Pure conversion helpers : safe to import from both client and server code.
 * Server-only data fetching lives in `currency.server.ts`.
 */
export function convertToW(amount: number | string, from: Currency, rates: RateMap): number {
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(n)) return 0
  return n * (rates[from] ?? 1)
}

export function convertBetween(amount: number | string, from: Currency, to: Currency, rates: RateMap): number {
  const inW = convertToW(amount, from, rates)
  const toRate = rates[to] ?? 1
  return toRate === 0 ? 0 : inW / toRate
}
