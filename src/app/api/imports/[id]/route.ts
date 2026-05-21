import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const patchSchema = z.object({
  supplierId: z.string().nullable().optional(),
  importDate: z.coerce.date().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const imp = await tx.import.update({ where: { id: (await params).id }, data: parsed.data })
      // If supplier changed, propagate to derived inventory (phones/sims created by this import) and to transaction-bound payments
      if (parsed.data.supplierId !== undefined) {
        const items = await tx.importItem.findMany({ where: { importId: imp.id }, select: { id: true } })
        const ids = items.map((i) => i.id)
        if (ids.length) {
          await tx.phone.updateMany({
            where: { importItemId: { in: ids } },
            data: { supplierId: parsed.data.supplierId },
          })
          await tx.simCard.updateMany({
            where: { importItemId: { in: ids } },
            data: { supplierId: parsed.data.supplierId },
          })
        }
        await tx.payment.updateMany({ where: { importId: imp.id }, data: { supplierId: parsed.data.supplierId } })
      }
      return imp
    })
    await audit({
      userId: auth.session.user.id,
      action: 'UPDATE',
      entity: 'Import',
      entityId: updated.id,
      details: parsed.data,
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.code === 'P2025') return badRequest('Not found')
    return badRequest(e.message || 'Update failed')
  }
}

// Delete an import : also reverses inventory effects.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  try {
    await prisma.$transaction(async (tx) => {
      const imp = await tx.import.findUnique({ where: { id: (await params).id }, include: { items: true } })
      if (!imp) throw Object.assign(new Error('Not found'), { code: 'P2025' })
      for (const it of imp.items) {
        if (it.itemType === 'PHONE') {
          const phone = await tx.phone.findFirst({ where: { importItemId: it.id } })
          if (phone) {
            if (phone.status !== 'AVAILABLE')
              throw new Error(`Cannot delete: phone ${phone.imei} already sold/reserved`)
            await tx.phone.delete({ where: { id: phone.id } })
          }
        } else if (it.itemType === 'SIM') {
          const sim = await tx.simCard.findFirst({ where: { importItemId: it.id } })
          if (sim) {
            if (sim.status !== 'AVAILABLE') throw new Error(`Cannot delete: sim ${sim.number} already sold`)
            await tx.simCard.delete({ where: { id: sim.id } })
          }
        } else if (it.itemType === 'ACCESSORY' && it.accessoryId) {
          await tx.accessory.update({
            where: { id: it.accessoryId },
            data: { boxesInStock: { decrement: it.quantity } },
          })
        }
      }
      await tx.import.delete({ where: { id: (await params).id } })
    })
    await audit({ userId: auth.session.user.id, action: 'DELETE', entity: 'Import', entityId: (await params).id })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return badRequest(e.message || 'Delete failed')
  }
}
