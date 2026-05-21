import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info'
  className?: string
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-amber-700 dark:text-amber-300',
    destructive: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  }
  return (
    <Card className={cn('p-5 flex items-start gap-4 surface-hover', className)}>
      {Icon && (
        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight truncate">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  )
}
