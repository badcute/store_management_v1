import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const createSchema = z.object({
  name: z.string().min(1),
  countPerBox: z.coerce.number().int().positive(),
  boxesInStock: z.coerce.number().int().nonnegative().optional(),
  purchasePricePerBox: z.coerce.number().nonnegative(),
  purchaseCurrency: z.nativeEnum(Currency),
  sellingPricePerBox: z.coerce.number().nonnegative().optional().nullable(),
  sellingCurrency: z.nativeEnum(Currency).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const items = await prisma.accessory.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  try {
    const a = await prisma.accessory.create({ data: { ...parsed.data, boxesInStock: parsed.data.boxesInStock ?? 0 } })
    await audit({
      userId: auth.session.user.id,
      action: 'CREATE',
      entity: 'Accessory',
      entityId: a.id,
      details: parsed.data,
    })
    return NextResponse.json(a)
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Accessory name already exists')
    throw e
  }
}
