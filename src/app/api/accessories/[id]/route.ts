import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  countPerBox: z.coerce.number().int().positive().optional(),
  boxesInStock: z.coerce.number().int().nonnegative().optional(),
  purchasePricePerBox: z.coerce.number().nonnegative().optional(),
  purchaseCurrency: z.nativeEnum(Currency).optional(),
  sellingPricePerBox: z.coerce.number().nonnegative().nullable().optional(),
  sellingCurrency: z.nativeEnum(Currency).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  try {
    const updated = await prisma.accessory.update({ where: { id: (await params).id }, data: parsed.data })
    await audit({
      userId: auth.session.user.id,
      action: 'UPDATE',
      entity: 'Accessory',
      entityId: updated.id,
      details: parsed.data,
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Accessory name already exists')
    if (e.code === 'P2025') return badRequest('Not found')
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  await prisma.accessory.delete({ where: { id: (await params).id } })
  await audit({ userId: auth.session.user.id, action: 'DELETE', entity: 'Accessory', entityId: (await params).id })
  return NextResponse.json({ ok: true })
}
