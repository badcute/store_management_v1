import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { hasRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { SimsClient } from './sims-client'

export const dynamic = 'force-dynamic'

export default async function SimsPage() {
  const session = await requireSession()
  const canSeeCosts = hasRole(session.user.role, Role.MANAGER)

  const [sims, suppliers] = await Promise.all([
    prisma.simCard.findMany({
      include: canSeeCosts ? { supplier: { select: { id: true, name: true } } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    canSeeCosts ? prisma.supplier.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
  ])
  return (
    <>
      <PageHeader title="Sim Cards" description="Inventory tracked by number" />
      <SimsClient
        canSeeCosts={canSeeCosts}
        initial={sims.map((s) => ({
          id: s.id,
          number: s.number,
          simType: s.simType,
          purchasePrice: canSeeCosts ? Number(s.purchasePrice) : null,
          purchaseCurrency: canSeeCosts ? s.purchaseCurrency : null,
          sellingPrice: s.sellingPrice == null ? null : Number(s.sellingPrice),
          sellingCurrency: s.sellingCurrency,
          status: s.status,
          notes: s.notes,
          supplierId: canSeeCosts ? s.supplierId : null,
          supplier: canSeeCosts ? ((s as any).supplier ?? null) : null,
        }))}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      />
    </>
  )
}
