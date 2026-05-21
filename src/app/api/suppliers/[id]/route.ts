import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  const data = { ...parsed.data, email: parsed.data.email === '' ? null : parsed.data.email }
  try {
    const s = await prisma.supplier.update({ where: { id: (await params).id }, data })
    await audit({ userId: auth.session.user.id, action: 'UPDATE', entity: 'Supplier', entityId: s.id, details: data })
    return NextResponse.json(s)
  } catch (e: any) {
    if (e.code === 'P2025') return badRequest('Not found')
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  await prisma.supplier.delete({ where: { id: (await params).id } })
  await audit({ userId: auth.session.user.id, action: 'DELETE', entity: 'Supplier', entityId: (await params).id })
  return NextResponse.json({ ok: true })
}
