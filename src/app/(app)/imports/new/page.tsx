import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'
import { PageHeader } from '@/components/page-header'
import { ImportForm } from './import-form'
import { getLatestRates } from '@/lib/currency.server'

export const dynamic = 'force-dynamic'

export default async function NewImportPage() {
  await requireRole(Role.MANAGER)
  const [suppliers, accessories, rates] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    prisma.accessory.findMany({ orderBy: { name: 'asc' } }),
    getLatestRates(),
  ])
  return (
    <>
      <PageHeader title="New Import" description="Record a delivery from a supplier" />
      <ImportForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        accessories={accessories.map((a) => ({ id: a.id, name: a.name, countPerBox: a.countPerBox }))}
        rates={rates}
      />
    </>
  )
}
