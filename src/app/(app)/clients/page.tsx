import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { ClientsClient } from './clients-client'
import { getLatestRates } from '@/lib/currency.server'
import { getClientBalance } from '@/lib/balances'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const [clients, rates] = await Promise.all([prisma.client.findMany({ orderBy: { name: 'asc' } }), getLatestRates()])

  const rows = await Promise.all(
    clients.map(async (c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      balance: await getClientBalance(c.id, rates),
    })),
  )

  return (
    <>
      <PageHeader title="Clients" description="People and companies who buy from you" />
      <ClientsClient initial={rows} />
    </>
  )
}
