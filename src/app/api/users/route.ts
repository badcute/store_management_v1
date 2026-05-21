import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
})

export async function GET() {
  const auth = await requireApiRole(Role.ADMIN)
  if (auth.error) return auth.error
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.ADMIN)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  try {
    const u = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        role: parsed.data.role,
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    })
    await audit({
      userId: auth.session.user.id,
      action: 'CREATE',
      entity: 'User',
      entityId: u.id,
      details: { email: u.email, role: u.role },
    })
    return NextResponse.json(u)
  } catch (e: any) {
    if (e.code === 'P2002') return badRequest('Email already in use')
    throw e
  }
}
