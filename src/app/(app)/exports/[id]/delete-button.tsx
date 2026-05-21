'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useToast } from '@/components/toast'
import { confirmAction } from '@/components/confirm'
import { Trash2 } from 'lucide-react'

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function onClick() {
    if (!confirmAction('Delete this sale? Inventory will be put back in stock.')) return
    setBusy(true)
    const res = await fetch(`/api/exports/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      toast.success('Sale deleted')
      router.push('/exports')
      router.refresh()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error('Delete failed', j.error)
    }
  }
  return (
    <Button variant="destructive" onClick={onClick} disabled={busy}>
      <Trash2 className="h-4 w-4 mr-1" /> {busy ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
