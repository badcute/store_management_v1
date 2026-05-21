import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { UsersClient } from './users-client'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  await requireRole(Role.ADMIN)
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return (
    <>
      <PageHeader title="Users" description="Admin-only : manage accounts and roles" />
      <UsersClient initial={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />
    </>
  )
}
