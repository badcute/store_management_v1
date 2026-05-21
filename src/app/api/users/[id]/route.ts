import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.ADMIN)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  const data: any = { ...parsed.data }
  if (data.email) data.email = data.email.toLowerCase()
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10)
    delete data.password
  }
  try {
    const u = await prisma.user.update({
      where: { id: (await params).id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    })
    await audit({
      userId: auth.session.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: u.id,
      details: { ...parsed.data, password: parsed.data.password ? '[changed]' : undefined },
    })
    return NextResponse.json(u)
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Email already in use')
    if (e.code === 'P2025') return badRequest('Not found')
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(Role.ADMIN)
  if (auth.error) return auth.error
  if (auth.session.user.id === (await params).id) return badRequest('You cannot delete your own account')
  await prisma.user.delete({ where: { id: (await params).id } })
  await audit({ userId: auth.session.user.id, action: 'DELETE', entity: 'User', entityId: (await params).id })
  return NextResponse.json({ ok: true })
}
