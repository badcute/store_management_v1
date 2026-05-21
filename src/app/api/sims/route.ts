import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, SimStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const createSchema = z.object({
  number: z.string().min(1),
  simType: z.string().optional().nullable(),
  purchasePrice: z.coerce.number().nonnegative(),
  purchaseCurrency: z.nativeEnum(Currency),
  sellingPrice: z.coerce.number().nonnegative().optional().nullable(),
  sellingCurrency: z.nativeEnum(Currency).optional().nullable(),
  status: z.nativeEnum(SimStatus).optional(),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const sims = await prisma.simCard.findMany({
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json(sims)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  try {
    const sim = await prisma.simCard.create({
      data: { ...parsed.data, status: parsed.data.status ?? SimStatus.AVAILABLE },
    })
    await audit({
      userId: auth.session.user.id,
      action: 'CREATE',
      entity: 'SimCard',
      entityId: sim.id,
      details: parsed.data,
    })
    return NextResponse.json(sim)
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Sim number already exists')
    throw e
  }
}
