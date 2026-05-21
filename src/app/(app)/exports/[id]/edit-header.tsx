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

export function EditExportHeader({
  id,
  clients,
  current,
}: {
  id: string
  clients: { id: string; name: string }[]
  current: { clientId: string | null; exportDate: string; notes: string | null }
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState(current.clientId ?? '')
  const [exportDate, setExportDate] = useState(current.exportDate)
  const [notes, setNotes] = useState(current.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const res = await fetch(`/api/exports/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId: clientId || null, exportDate, notes: notes || null }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Save failed')
      return
    }
    toast.success('Sale updated')
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
            <DialogTitle>Edit sale header</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Combobox
                value={clientId || null}
                onChange={(v) => setClientId(v ?? '')}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Search client..."
                allowEmpty
                emptyLabel="- Walk-in -"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <DatePicker value={exportDate} onChange={setExportDate} required />
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
