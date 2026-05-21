import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PhoneStatus, Role, SimStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const patchSchema = z.object({
  clientId: z.string().nullable().optional(),
  exportDate: z.coerce.date().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const ex = await tx.export.update({ where: { id: (await params).id }, data: parsed.data })
      if (parsed.data.clientId !== undefined) {
        await tx.payment.updateMany({ where: { exportId: ex.id }, data: { clientId: parsed.data.clientId } })
      }
      return ex
    })
    await audit({
      userId: auth.session.user.id,
      action: 'UPDATE',
      entity: 'Export',
      entityId: updated.id,
      details: parsed.data,
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e.code === 'P2025') return badRequest('Not found')
    return badRequest(e.message || 'Update failed')
  }
}

// Delete an export : reverses inventory effects (puts items back).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  try {
    await prisma.$transaction(async (tx) => {
      const ex = await tx.export.findUnique({ where: { id: (await params).id }, include: { items: true } })
      if (!ex) throw Object.assign(new Error('Not found'), { code: 'P2025' })
      for (const it of ex.items) {
        if (it.itemType === 'PHONE' && it.phoneId) {
          await tx.phone.update({ where: { id: it.phoneId }, data: { status: PhoneStatus.AVAILABLE } })
        } else if (it.itemType === 'SIM' && it.simCardId) {
          await tx.simCard.update({ where: { id: it.simCardId }, data: { status: SimStatus.AVAILABLE } })
        } else if (it.itemType === 'ACCESSORY' && it.accessoryId) {
          await tx.accessory.update({
            where: { id: it.accessoryId },
            data: { boxesInStock: { increment: it.quantity } },
          })
        }
      }
      await tx.export.delete({ where: { id: (await params).id } })
    })
    await audit({ userId: auth.session.user.id, action: 'DELETE', entity: 'Export', entityId: (await params).id })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return badRequest(e.message || 'Delete failed')
  }
}
