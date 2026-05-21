import { prisma } from './prisma'
import { convertToW, type RateMap } from './currency'

export type Balance = {
  totalChargedW: number // total amount of exports (for clients) or imports (for suppliers) in W
  totalPaidW: number // total payments in W
  outstandingW: number // charged - paid (positive => they owe us / we owe them)
}

export async function getClientBalance(clientId: string, rates: RateMap): Promise<Balance> {
  const exports = await prisma.export.findMany({
    where: { clientId },
    include: { items: true },
  })
  const payments = await prisma.payment.findMany({ where: { clientId, direction: 'RECEIVED' } })

  let totalChargedW = 0
  for (const ex of exports) {
    for (const item of ex.items) {
      totalChargedW += convertToW(Number(item.unitPrice), item.currency, rates) * item.quantity
    }
  }
  const totalPaidW = payments.reduce((s, p) => s + convertToW(Number(p.amount), p.currency, rates), 0)
  return { totalChargedW, totalPaidW, outstandingW: totalChargedW - totalPaidW }
}

export async function getSupplierBalance(supplierId: string, rates: RateMap): Promise<Balance> {
  const imports = await prisma.import.findMany({
    where: { supplierId },
    include: { items: true },
  })
  const payments = await prisma.payment.findMany({ where: { supplierId, direction: 'PAID' } })

  let totalChargedW = 0
  for (const im of imports) {
    for (const item of im.items) {
      totalChargedW += convertToW(Number(item.unitCost), item.currency, rates) * item.quantity
    }
  }
  const totalPaidW = payments.reduce((s, p) => s + convertToW(Number(p.amount), p.currency, rates), 0)
  return { totalChargedW, totalPaidW, outstandingW: totalChargedW - totalPaidW }
}

// Per-transaction balances : only include payments tied to that specific import/export.

type ImportLike = {
  items: { unitCost: number | string | { toString(): string }; currency: any; quantity: number }[]
  payments: { amount: number | string | { toString(): string }; currency: any }[]
}
type ExportLike = {
  items: { unitPrice: number | string | { toString(): string }; currency: any; quantity: number }[]
  payments: { amount: number | string | { toString(): string }; currency: any }[]
}

export function calcImportBalance(imp: ImportLike, rates: RateMap): Balance {
  const totalChargedW = imp.items.reduce(
    (s, it) => s + convertToW(Number(it.unitCost), it.currency, rates) * it.quantity,
    0,
  )
  const totalPaidW = imp.payments.reduce((s, p) => s + convertToW(Number(p.amount), p.currency, rates), 0)
  return { totalChargedW, totalPaidW, outstandingW: totalChargedW - totalPaidW }
}

export function calcExportBalance(ex: ExportLike, rates: RateMap): Balance {
  const totalChargedW = ex.items.reduce(
    (s, it) => s + convertToW(Number(it.unitPrice), it.currency, rates) * it.quantity,
    0,
  )
  const totalPaidW = ex.payments.reduce((s, p) => s + convertToW(Number(p.amount), p.currency, rates), 0)
  return { totalChargedW, totalPaidW, outstandingW: totalChargedW - totalPaidW }
}
