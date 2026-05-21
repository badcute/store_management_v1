import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/session'
import { hasRole } from '@/lib/auth'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { AccessoriesClient } from './accessories-client'

export const dynamic = 'force-dynamic'

export default async function AccessoriesPage() {
  const session = await requireSession()
  const canSeeCosts = hasRole(session.user.role, Role.MANAGER)
  const items = await prisma.accessory.findMany({ orderBy: { name: 'asc' } })
  return (
    <>
      <PageHeader title="Accessories" description="Stocked by box. Each box contains N items." />
      <AccessoriesClient
        canSeeCosts={canSeeCosts}
        initial={items.map((a) => ({
          id: a.id,
          name: a.name,
          countPerBox: a.countPerBox,
          boxesInStock: a.boxesInStock,
          purchasePricePerBox: canSeeCosts ? Number(a.purchasePricePerBox) : null,
          purchaseCurrency: canSeeCosts ? a.purchaseCurrency : null,
          sellingPricePerBox: a.sellingPricePerBox == null ? null : Number(a.sellingPricePerBox),
          sellingCurrency: a.sellingCurrency,
          notes: a.notes,
        }))}
      />
    </>
  )
}
