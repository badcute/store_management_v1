import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

export async function GET() {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const rows = await prisma.currencyRate.findMany({
    orderBy: { effectiveAt: 'desc' },
    include: { updatedBy: { select: { name: true, email: true } } },
    take: 100,
  })
  return NextResponse.json(rows)
}

const schema = z.object({
  code: z.nativeEnum(Currency),
  rateToW: z.coerce.number().positive(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  if (parsed.data.code === Currency.W && parsed.data.rateToW !== 1) {
    return badRequest('W is the main currency : its rate is always 1.')
  }
  const row = await prisma.currencyRate.create({
    data: {
      code: parsed.data.code,
      rateToW: parsed.data.rateToW,
      notes: parsed.data.notes,
      updatedById: auth.session.user.id,
    },
  })
  await audit({
    userId: auth.session.user.id,
    action: 'RATE_UPDATE',
    entity: 'CurrencyRate',
    entityId: row.id,
    details: parsed.data,
  })
  return NextResponse.json(row)
}
