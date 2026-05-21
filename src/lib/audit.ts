import { prisma } from './prisma'

export async function audit(params: {
  userId?: string | null
  action: string
  entity: string
  entityId?: string | null
  details?: unknown
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        details:
          params.details == null
            ? null
            : typeof params.details === 'string'
              ? params.details
              : JSON.stringify(params.details),
      },
    })
  } catch (err) {
    console.error('[audit] failed to record', err)
  }
}
