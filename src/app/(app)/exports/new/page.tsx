import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { ExportForm } from './export-form'
import { PhoneStatus, SimStatus } from '@prisma/client'
import { getLatestRates } from '@/lib/currency.server'
import { convertToW } from '@/lib/currency'

export const dynamic = 'force-dynamic'

export default async function NewExportPage() {
  const [clients, phones, sims, accessories, rates] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { exports: { include: { items: true } }, payments: { where: { direction: 'RECEIVED' } } },
    }),
    prisma.phone.findMany({ where: { status: PhoneStatus.AVAILABLE }, orderBy: { createdAt: 'desc' } }),
    prisma.simCard.findMany({ where: { status: SimStatus.AVAILABLE }, orderBy: { createdAt: 'desc' } }),
    prisma.accessory.findMany({ where: { boxesInStock: { gt: 0 } }, orderBy: { name: 'asc' } }),
    getLatestRates(),
  ])

  const clientsOut = clients.map((c) => {
    const charged = c.exports.reduce(
      (s, ex) =>
        s + ex.items.reduce((a, it) => a + convertToW(Number(it.unitPrice), it.currency, rates) * it.quantity, 0),
      0,
    )
    const paid = c.payments.reduce((s, p) => s + convertToW(Number(p.amount), p.currency, rates), 0)
    return { id: c.id, name: c.name, outstandingW: Math.max(0, charged - paid) }
  })

  return (
    <>
      <PageHeader title="New Sale" description="Record items sold to a client" />
      <ExportForm
        clients={clientsOut}
        phones={phones.map((p) => ({
          id: p.id,
          model: p.model,
          imei: p.imei,
          sellingPrice: p.sellingPrice == null ? null : Number(p.sellingPrice),
          sellingCurrency: p.sellingCurrency,
        }))}
        sims={sims.map((s) => ({
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
    </>
  )
}
