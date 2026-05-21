import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Currency, ItemType, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const phoneItem = z.object({
  itemType: z.literal('PHONE'),
  quantity: z.literal(1).default(1),
  unitCost: z.coerce.number().nonnegative(),
  currency: z.nativeEnum(Currency),
  phone: z.object({ model: z.string().min(1), imei: z.string().min(1) }),
})

const simItem = z.object({
  itemType: z.literal('SIM'),
  quantity: z.literal(1).default(1),
  unitCost: z.coerce.number().nonnegative(),
  currency: z.nativeEnum(Currency),
  sim: z.object({ number: z.string().min(1), simType: z.string().optional().nullable() }),
})

const accessoryItem = z.object({
  itemType: z.literal('ACCESSORY'),
  quantity: z.coerce.number().int().positive(), // number of boxes
  unitCost: z.coerce.number().nonnegative(),
  currency: z.nativeEnum(Currency),
  accessory: z.object({
    accessoryId: z.string().optional(),
    name: z.string().optional(),
    countPerBox: z.coerce.number().int().positive().optional(),
  }),
})

const schema = z.object({
  supplierId: z.string().optional().nullable(),
  importDate: z.coerce.date().optional(),
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
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const rows = await prisma.import.findMany({
    include: { supplier: { select: { id: true, name: true } }, items: true, createdBy: { select: { name: true } } },
    orderBy: { importDate: 'desc' },
    take: 200,
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  const data = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      const imp = await tx.import.create({
        data: {
          supplierId: data.supplierId || null,
          importDate: data.importDate ?? new Date(),
          notes: data.notes ?? null,
          createdById: auth.session.user.id,
        },
      })
      for (const it of data.items) {
        if (it.itemType === 'PHONE') {
          const importItem = await tx.importItem.create({
            data: {
              importId: imp.id,
              itemType: ItemType.PHONE,
              quantity: 1,
              unitCost: it.unitCost,
              currency: it.currency,
            },
          })
          await tx.phone.create({
            data: {
              model: it.phone.model,
              imei: it.phone.imei,
              purchasePrice: it.unitCost,
              purchaseCurrency: it.currency,
              supplierId: data.supplierId || null,
              importItemId: importItem.id,
            },
          })
        } else if (it.itemType === 'SIM') {
          const importItem = await tx.importItem.create({
            data: {
              importId: imp.id,
              itemType: ItemType.SIM,
              quantity: 1,
              unitCost: it.unitCost,
              currency: it.currency,
            },
          })
          await tx.simCard.create({
            data: {
              number: it.sim.number,
              simType: it.sim.simType ?? null,
              purchasePrice: it.unitCost,
              purchaseCurrency: it.currency,
              supplierId: data.supplierId || null,
              importItemId: importItem.id,
            },
          })
        } else {
          // ACCESSORY
          let accessoryId = it.accessory.accessoryId
          if (!accessoryId) {
            if (!it.accessory.name) throw new Error('Accessory name required for new accessory')
            const created = await tx.accessory.create({
              data: {
                name: it.accessory.name,
                countPerBox: it.accessory.countPerBox ?? 1,
                boxesInStock: it.quantity,
                purchasePricePerBox: it.unitCost,
                purchaseCurrency: it.currency,
              },
            })
            accessoryId = created.id
          } else {
            await tx.accessory.update({
              where: { id: accessoryId },
              data: {
                boxesInStock: { increment: it.quantity },
                purchasePricePerBox: it.unitCost,
                purchaseCurrency: it.currency,
              },
            })
          }
          await tx.importItem.create({
            data: {
              importId: imp.id,
              itemType: ItemType.ACCESSORY,
              quantity: it.quantity,
              unitCost: it.unitCost,
              currency: it.currency,
              accessoryId,
            },
          })
        }
      }
      if (data.initialPayment) {
        await tx.payment.create({
          data: {
            direction: 'PAID',
            amount: data.initialPayment.amount,
            currency: data.initialPayment.currency,
            paymentDate: data.initialPayment.paymentDate ?? new Date(),
            notes: data.initialPayment.notes ?? null,
            supplierId: data.supplierId || null,
            importId: imp.id,
            recordedById: auth.session.user.id,
          },
        })
      }
      return imp
    })

    await audit({
      userId: auth.session.user.id,
      action: 'CREATE',
      entity: 'Import',
      entityId: result.id,
      details: { items: data.items.length, initialPayment: !!data.initialPayment },
    })
    return NextResponse.json(result)
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Duplicate IMEI or sim number in this import')
    return badRequest(e.message || 'Import failed')
  }
}
