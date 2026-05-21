// Remove a single line item from an existing import (with inventory rollback).
import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const auth = await requireApiRole(Role.MANAGER)
  if (auth.error) return auth.error
  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.importItem.findUnique({ where: { id: (await params).itemId } })
      if (!item || item.importId !== (await params).id)
        throw Object.assign(new Error('Item not found'), { code: 'P2025' })
      if (item.itemType === 'PHONE') {
        const phone = await tx.phone.findFirst({ where: { importItemId: item.id } })
        if (phone) {
          if (phone.status !== 'AVAILABLE') throw new Error(`Cannot remove: phone ${phone.imei} already sold/reserved`)
          await tx.phone.delete({ where: { id: phone.id } })
        }
      } else if (item.itemType === 'SIM') {
        const sim = await tx.simCard.findFirst({ where: { importItemId: item.id } })
        if (sim) {
          if (sim.status !== 'AVAILABLE') throw new Error(`Cannot remove: sim ${sim.number} already sold`)
          await tx.simCard.delete({ where: { id: sim.id } })
        }
      } else if (item.itemType === 'ACCESSORY' && item.accessoryId) {
        const acc = await tx.accessory.findUnique({ where: { id: item.accessoryId } })
        if (acc && acc.boxesInStock < item.quantity)
          throw new Error(`Cannot remove: only ${acc.boxesInStock} box(es) in stock, would go negative`)
        await tx.accessory.update({
          where: { id: item.accessoryId },
          data: { boxesInStock: { decrement: item.quantity } },
        })
      }
      await tx.importItem.delete({ where: { id: item.id } })
    })
    await audit({
      userId: auth.session.user.id,
      action: 'DELETE',
      entity: 'ImportItem',
      entityId: (await params).itemId,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return badRequest(e.message || 'Remove failed')
  }
}
