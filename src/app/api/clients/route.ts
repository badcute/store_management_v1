import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { badRequest, requireApiRole } from '@/lib/api'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(Role.STAFF)
  if (auth.error) return auth.error
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())
  const data = { ...parsed.data, email: parsed.data.email === '' ? null : parsed.data.email }
  const c = await prisma.client.create({ data })
  await audit({ userId: auth.session.user.id, action: 'CREATE', entity: 'Client', entityId: c.id, details: data })
  return NextResponse.json(c)
}
