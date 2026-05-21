// Remove a single line item from an existing export (with inventory rollback).
import { NextRequest, NextResponse } from 'next/server'
import { PhoneStatus, Role, SimStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.exportItem.findUnique({ where: { id: (await params).itemId } })
      if (!item || item.exportId !== (await params).id)
        throw Object.assign(new Error('Item not found'), { code: 'P2025' })
      if (item.itemType === 'PHONE' && item.phoneId) {
        await tx.phone.update({ where: { id: item.phoneId }, data: { status: PhoneStatus.AVAILABLE } })
      } else if (item.itemType === 'SIM' && item.simCardId) {
        await tx.simCard.update({ where: { id: item.simCardId }, data: { status: SimStatus.AVAILABLE } })
      } else if (item.itemType === 'ACCESSORY' && item.accessoryId) {
        await tx.accessory.update({
          where: { id: item.accessoryId },
          data: { boxesInStock: { increment: item.quantity } },
        })
      }
      await tx.exportItem.delete({ where: { id: item.id } })
    })
    await audit({
      userId: auth.session.user.id,
      action: 'DELETE',
      entity: 'ExportItem',
      entityId: (await params).itemId,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return badRequest(e.message || 'Remove failed')
  }
}
