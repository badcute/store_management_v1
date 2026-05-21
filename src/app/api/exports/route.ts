import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, ItemType, PhoneStatus, Role, SimStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const phoneItem = z.object({
  itemType: z.literal('PHONE'),
  phoneId: z.string().min(1),
  quantity: z.literal(1).default(1),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.nativeEnum(Currency),
})
const simItem = z.object({
  itemType: z.literal('SIM'),
  simCardId: z.string().min(1),
  quantity: z.literal(1).default(1),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.nativeEnum(Currency),
})
const accessoryItem = z.object({
  itemType: z.literal('ACCESSORY'),
  accessoryId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.nativeEnum(Currency),
})

const schema = z.object({
  clientId: z.string().optional().nullable(),
  exportDate: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(z.discriminatedUnion('itemType', [phoneItem, simItem, accessoryItem])).min(1),
  initialPayment: z
    .object({
      amount: z.coerce.number().positive(),
      currency: z.nativeEnum(Currency),
      paymentDate: z.coerce.date().optional(),
      notes: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
})

export async function GET() {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const rows = await prisma.export.findMany({
    include: { client: { select: { id: true, name: true } }, items: true, createdBy: { select: { name: true } } },
    orderBy: { exportDate: 'desc' },
    take: 200,
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  const data = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ex = await tx.export.create({
        data: {
          clientId: data.clientId || null,
          exportDate: data.exportDate ?? new Date(),
          notes: data.notes ?? null,
          createdById: auth.session.user.id,
        },
      })
      for (const it of data.items) {
        if (it.itemType === 'PHONE') {
          const phone = await tx.phone.findUnique({ where: { id: it.phoneId } })
          if (!phone) throw new Error('Phone not found')
          if (phone.status !== PhoneStatus.AVAILABLE)
            throw new Error(`Phone ${phone.imei} is not available (status: ${phone.status})`)
          await tx.phone.update({
            where: { id: phone.id },
            data: { status: PhoneStatus.SOLD, sellingPrice: it.unitPrice, sellingCurrency: it.currency },
          })
          await tx.exportItem.create({
            data: {
              exportId: ex.id,
              itemType: ItemType.PHONE,
              phoneId: phone.id,
              quantity: 1,
              unitPrice: it.unitPrice,
              currency: it.currency,
            },
          })
        } else if (it.itemType === 'SIM') {
          const sim = await tx.simCard.findUnique({ where: { id: it.simCardId } })
          if (!sim) throw new Error('Sim not found')
          if (sim.status !== SimStatus.AVAILABLE) throw new Error(`Sim ${sim.number} is not available`)
          await tx.simCard.update({
            where: { id: sim.id },
            data: { status: SimStatus.SOLD, sellingPrice: it.unitPrice, sellingCurrency: it.currency },
          })
          await tx.exportItem.create({
            data: {
              exportId: ex.id,
              itemType: ItemType.SIM,
              simCardId: sim.id,
              quantity: 1,
              unitPrice: it.unitPrice,
              currency: it.currency,
            },
          })
        } else {
          // ACCESSORY
          const acc = await tx.accessory.findUnique({ where: { id: it.accessoryId } })
          if (!acc) throw new Error('Accessory not found')
          if (acc.boxesInStock < it.quantity) throw new Error(`${acc.name}: only ${acc.boxesInStock} box(es) in stock`)
          await tx.accessory.update({
            where: { id: acc.id },
            data: {
              boxesInStock: { decrement: it.quantity },
              sellingPricePerBox: it.unitPrice,
              sellingCurrency: it.currency,
            },
          })
          await tx.exportItem.create({
            data: {
              exportId: ex.id,
              itemType: ItemType.ACCESSORY,
              accessoryId: acc.id,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              currency: it.currency,
            },
          })
        }
      }
      if (data.initialPayment) {
        await tx.payment.create({
          data: {
            direction: 'RECEIVED',
            amount: data.initialPayment.amount,
            currency: data.initialPayment.currency,
            paymentDate: data.initialPayment.paymentDate ?? new Date(),
            notes: data.initialPayment.notes ?? null,
            clientId: data.clientId || null,
            exportId: ex.id,
            recordedById: auth.session.user.id,
          },
        })
      }
      return ex
    })

    await audit({
      userId: auth.session.user.id,
      action: 'CREATE',
      entity: 'Export',
      entityId: result.id,
      details: { items: data.items.length, initialPayment: !!data.initialPayment },
    })
    return NextResponse.json(result)
  } catch (e: any) {
    return badRequest(e.message || 'Export failed')
  }
}
