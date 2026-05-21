import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hasRole } from './auth'
import { Role } from '@prisma/client'

export async function apiSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export async function requireApiRole(role: Role) {
  const session = await apiSession()
  if (!session) return { error: unauthorized(), session: null as never }
  if (!hasRole(session.user.role, role)) return { error: forbidden(), session: null as never }
  return { error: null as null, session }
}
