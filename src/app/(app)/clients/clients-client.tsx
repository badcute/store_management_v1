'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClickableRow } from '@/components/clickable-row'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Money } from '@/components/money-display'
import { SearchInput } from '@/components/search-input'
import { BalanceCell } from '@/components/balance-cell'
import { TableEmpty } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { confirmAction } from '@/components/confirm'
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react'

type Row = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  balance: { totalChargedW: number; totalPaidW: number; outstandingW: number }
}

export function ClientsClient({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)

  const filtered = useMemo(
    () =>
      initial.filter((c) => {
        if (!q) return true
        const s = q.toLowerCase()
        return (
          c.name.toLowerCase().includes(s) ||
          (c.phone ?? '').toLowerCase().includes(s) ||
          (c.email ?? '').toLowerCase().includes(s)
        )
      }),
    [initial, q],
  )

  async function onDelete(c: Row) {
    if (!confirmAction(`Delete ${c.name}?`)) return
    const res = await fetch(`/api/clients/${c.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Client deleted')
      router.refresh()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error('Delete failed', j.error)
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardContent className="pt-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label>Search</Label>
            <SearchInput value={q} onChange={setQ} placeholder="Name, phone, or email…" />
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add client
          </Button>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmpty
                colSpan={7}
                title="No clients"
                description="Add a client to track their purchases and balances."
              />
            )}
            {filtered.map((c) => (
              <ClickableRow key={c.id} href={`/clients/${c.id}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? '-'}</TableCell>
                <TableCell className="text-right">
                  <Money amount={c.balance.totalChargedW} currency="W" />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={c.balance.totalPaidW} currency="W" />
                </TableCell>
                <TableCell className="text-right">
                  <BalanceCell amountW={c.balance.outstandingW} />
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c)
                      setOpen(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => onDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </ClickableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ClientFormDialog
        key={editing?.id ?? 'new'}
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setEditing(null)
        }}
        editing={editing}
        onSaved={() => {
          setOpen(false)
          setEditing(null)
          router.refresh()
          toast.success(editing ? 'Client updated' : 'Client added')
        }}
      />
    </>
  )
}

function ClientFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Row | null
  onSaved: () => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [address, setAddress] = useState(editing?.address ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload = { name, phone: phone || null, email: email || null, address: address || null, notes: notes || null }
    const res = editing
      ? await fetch(`/api/clients/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/clients`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Save failed')
      return
    }
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit client' : 'Add client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email ?? ''} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={address ?? ''} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes ?? ''} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
