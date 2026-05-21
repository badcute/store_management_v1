'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'default' | 'success' | 'destructive' | 'info'
type Toast = { id: string; title?: string; description?: string; variant: ToastVariant }

type Ctx = {
  toast: (t: Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }) => void
  success: (msg: string, description?: string) => void
  error: (msg: string, description?: string) => void
  info: (msg: string, description?: string) => void
}
const ToastCtx = createContext<Ctx | null>(null)

export function useToast() {
  const v = useContext(ToastCtx)
  if (!v) throw new Error('useToast must be used within ToastProvider')
  return v
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((t: Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((cur) => [...cur, { id, variant: t.variant ?? 'default', title: t.title, description: t.description }])
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 4000)
  }, [])

  const value: Ctx = {
    toast: push,
    success: (title, description) => push({ title, description, variant: 'success' }),
    error: (title, description) => push({ title, description, variant: 'destructive' }),
    info: (title, description) => push({ title, description, variant: 'info' }),
  }

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onClose={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const cfg = {
    default: { icon: Info, ring: 'border-border', iconColor: 'text-foreground' },
    success: { icon: CheckCircle2, ring: 'border-success/30', iconColor: 'text-success' },
    destructive: { icon: AlertCircle, ring: 'border-destructive/30', iconColor: 'text-destructive' },
    info: { icon: Info, ring: 'border-info/30', iconColor: 'text-info' },
  }[t.variant]
  const Icon = cfg.icon

  return (
    <div
      className={cn(
        'surface px-4 py-3 flex items-start gap-3 transition-all duration-200',
        cfg.ring,
        open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4',
      )}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.iconColor)} />
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-sm font-medium">{t.title}</p>}
        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
      </div>
      <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
