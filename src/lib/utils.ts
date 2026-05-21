import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number | string | null | undefined, currency?: string | null) {
  if (amount === null || amount === undefined) return ':'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(n)) return ':'
  const fixed = n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return currency ? `${fixed} ${currency}` : fixed
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return ':'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString()
}
