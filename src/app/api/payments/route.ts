import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, PaymentDirection, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, forbidden, requireApiRole } from '@/lib/api'
import { hasRole } from '@/lib/auth'

const schema = z
  .object({
    direction: z.nativeEnum(PaymentDirection).optional(), // auto-derived if importId/exportId given
    amount: z.coerce.number().positive(),
    currency: z.nativeEnum(Currency),
    paymentDate: z.coerce.date().optional(),
    notes: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
    supplierId: z.string().optional().nullable(),
    importId: z.string().optional().nullable(),
    exportId: z.string().optional().nullable(),
  })
  .refine((d) => d.clientId || d.supplierId || d.importId || d.exportId, {
    message: 'Provide clientId, supplierId, importId, or exportId',
  })

export async function GET(req: NextRequest) {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const isStaffOnly = !hasRole(auth.session.user.role, Role.MANAGER)
  const url = new URL(req.url)
  const direction = url.searchParams.get('direction') as PaymentDirection | null
  const importId = url.searchParams.get('importId')
  const exportId = url.searchParams.get('exportId')
  // Staff: never expose PAID payments or import-bound payments
  if (isStaffOnly && (importId || direction === PaymentDirection.PAID)) {
    return NextResponse.json([])
  }
  const rows = await prisma.payment.findMany({
    where: {
      ...(isStaffOnly ? { direction: PaymentDirection.RECEIVED, importId: null, supplierId: null } : {}),
      ...(direction ? { direction } : {}),
      ...(importId ? { importId } : {}),
      ...(exportId ? { exportId } : {}),
    },
    include: { client: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } },
    orderBy: { paymentDate: 'desc' },
    take: 500,
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const isStaffOnly = !hasRole(auth.session.user.role, Role.MANAGER)
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  const data = parsed.data

  // Staff can only record payments received from clients; block supplier/import flows.
  if (isStaffOnly && (data.supplierId || data.importId || data.direction === PaymentDirection.PAID)) {
    return forbidden()
  }

  // Derive party from import/export if not explicitly given
  let clientId = data.clientId || null
  let supplierId = data.supplierId || null
  let direction = data.direction

  if (data.importId) {
    const imp = await prisma.import.findUnique({ where: { id: data.importId }, select: { supplierId: true } })
    if (!imp) return badRequest('Import not found')
    supplierId = imp.supplierId
    direction = PaymentDirection.PAID
  }
  if (data.exportId) {
    const ex = await prisma.export.findUnique({ where: { id: data.exportId }, select: { clientId: true } })
    if (!ex) return badRequest('Export not found')
    clientId = ex.clientId
    direction = PaymentDirection.RECEIVED
  }
  if (!direction) {
    direction = clientId ? PaymentDirection.RECEIVED : PaymentDirection.PAID
  }

  const p = await prisma.payment.create({
    data: {
      direction,
      amount: data.amount,
      currency: data.currency,
      paymentDate: data.paymentDate ?? new Date(),
      notes: data.notes ?? null,
      clientId,
      supplierId,
      importId: data.importId || null,
      exportId: data.exportId || null,
      recordedById: auth.session.user.id,
    },
  })
  await audit({ userId: auth.session.user.id, action: 'CREATE', entity: 'Payment', entityId: p.id, details: data })
  return NextResponse.json(p)
}
