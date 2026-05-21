import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { TableEmpty } from '@/components/empty-state'
import { requireRole } from '@/lib/session'
import { Role } from '@prisma/client'

export const dynamic = 'force-dynamic'

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'info' | 'destructive' | 'warning' | 'success'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'destructive',
  LOGIN: 'secondary',
  RATE_UPDATE: 'warning',
}

export default async function AuditLogsPage() {
  await requireRole(Role.ADMIN)
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return (
    <>
      <PageHeader title="Audit Logs" description="Admin-only : actions performed in the system" />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && <TableEmpty colSpan={6} title="No logs yet" />}
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">{formatDate(l.createdAt)}</TableCell>
                <TableCell className="font-medium">{l.user?.name ?? ':'}</TableCell>
                <TableCell>
                  <Badge variant={ACTION_VARIANT[l.action] ?? 'secondary'}>{l.action}</Badge>
                </TableCell>
                <TableCell>{l.entity}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {l.entityId?.slice(-8) ?? ':'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-md truncate" title={l.details ?? undefined}>
                  {l.details ?? ':'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
