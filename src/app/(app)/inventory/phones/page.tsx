import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { hasRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { PhonesClient } from './phones-client'

export const dynamic = 'force-dynamic'

export default async function PhonesPage() {
  const session = await requireSession()
  const canSeeCosts = hasRole(session.user.role, Role.MANAGER)

  const [phones, suppliers] = await Promise.all([
    prisma.phone.findMany({
      include: canSeeCosts ? { supplier: { select: { id: true, name: true } } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    canSeeCosts ? prisma.supplier.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
  ])
  return (
    <>
      <PageHeader title="Phones" description="Inventory tracked by IMEI" />
      <PhonesClient
        canSeeCosts={canSeeCosts}
        initial={phones.map((p) => ({
          id: p.id,
          model: p.model,
          imei: p.imei,
          purchasePrice: canSeeCosts ? Number(p.purchasePrice) : null,
          purchaseCurrency: canSeeCosts ? p.purchaseCurrency : null,
          sellingPrice: p.sellingPrice == null ? null : Number(p.sellingPrice),
          sellingCurrency: p.sellingCurrency,
          status: p.status,
          notes: p.notes,
          supplierId: canSeeCosts ? p.supplierId : null,
          supplier: canSeeCosts ? ((p as any).supplier ?? null) : null,
          createdAt: p.createdAt.toISOString(),
        }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </>
  )
}
