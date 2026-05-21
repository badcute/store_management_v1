import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { SuppliersClient } from './suppliers-client'
import { getLatestRates } from '@/lib/currency.server'
import { getSupplierBalance } from '@/lib/balances'

export const dynamic = 'force-dynamic'

export default async function SuppliersPage() {
  await requireRole(Role.MANAGER)
  const [suppliers, rates] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    getLatestRates(),
  ])
  const rows = await Promise.all(
    suppliers.map(async (s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      balance: await getSupplierBalance(s.id, rates),
    })),
  )

  return (
    <>
      <PageHeader title="Suppliers" description="Companies and people you buy goods from" />
      <SuppliersClient initial={rows} />
    </>
  )
}
