import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions, hasRole } from './auth'
import { Role } from '@prisma/client'

export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  return session
}

export async function requireRole(required: Role) {
  const session = await requireSession()
  if (!hasRole(session.user.role, required)) redirect('/dashboard')
  return session
}

export async function getSession() {
  return getServerSession(authOptions)
}
