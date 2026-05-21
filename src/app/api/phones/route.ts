import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, PhoneStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const status = url.searchParams.get('status') as PhoneStatus | null
  const phones = await prisma.phone.findMany({
    where: {
      ...(q
        ? { OR: [{ imei: { contains: q, mode: 'insensitive' } }, { model: { contains: q, mode: 'insensitive' } }] }
        : {}),
      ...(status ? { status } : {}),
    },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return NextResponse.json(phones)
}

const createSchema = z.object({
  model: z.string().min(1),
  imei: z.string().min(1),
  purchasePrice: z.coerce.number().nonnegative(),
  purchaseCurrency: z.nativeEnum(Currency),
  sellingPrice: z.coerce.number().nonnegative().optional(),
  sellingCurrency: z.nativeEnum(Currency).optional(),
  status: z.nativeEnum(PhoneStatus).optional(),
  supplierId: z.string().optional().nullable(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  try {
    const phone = await prisma.phone.create({
      data: {
        model: parsed.data.model,
        imei: parsed.data.imei,
        purchasePrice: parsed.data.purchasePrice,
        purchaseCurrency: parsed.data.purchaseCurrency,
        sellingPrice: parsed.data.sellingPrice,
        sellingCurrency: parsed.data.sellingCurrency,
        status: parsed.data.status ?? PhoneStatus.AVAILABLE,
        supplierId: parsed.data.supplierId || null,
        notes: parsed.data.notes,
      },
    })
    await audit({
      userId: auth.session.user.id,
      action: 'CREATE',
      entity: 'Phone',
      entityId: phone.id,
      details: parsed.data,
    })
    return NextResponse.json(phone)
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('IMEI already exists')
    throw e
  }
}
