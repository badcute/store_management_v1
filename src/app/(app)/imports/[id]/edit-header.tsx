'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DatePicker } from '@/components/date-picker'
import { Combobox } from '@/components/combobox'
import { useToast } from '@/components/toast'
import { Pencil } from 'lucide-react'

export function EditImportHeader({
  id,
  suppliers,
  current,
}: {
  id: string
  suppliers: { id: string; name: string }[]
  current: { supplierId: string | null; importDate: string; notes: string | null }
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [supplierId, setSupplierId] = useState(current.supplierId ?? '')
  const [importDate, setImportDate] = useState(current.importDate)
  const [notes, setNotes] = useState(current.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const res = await fetch(`/api/imports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ supplierId: supplierId || null, importDate, notes: notes || null }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Save failed')
      return
    }
    toast.success('Import updated')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 mr-1" /> Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit import header</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Combobox
                value={supplierId || null}
                onChange={(v) => setSupplierId(v ?? '')}
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Search supplier..."
                allowEmpty
                emptyLabel="- None -"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <DatePicker value={importDate} onChange={setImportDate} required />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
