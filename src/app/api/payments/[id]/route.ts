import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { requireApiRole } from '@/lib/api'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  await prisma.payment.delete({ where: { id: (await params).id } })
  await audit({ userId: auth.session.user.id, action: 'DELETE', entity: 'Payment', entityId: (await params).id })
  return NextResponse.json({ ok: true })
}
