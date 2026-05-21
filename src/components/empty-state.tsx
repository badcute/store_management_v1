import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      {Icon && (
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function TableEmpty({ colSpan, title, description }: { colSpan: number; title?: string; description?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-muted-foreground py-10">
        <p className="font-medium">{title ?? 'Nothing here yet'}</p>
        {description && <p className="text-xs mt-1">{description}</p>}
      </td>
    </tr>
  )
}
