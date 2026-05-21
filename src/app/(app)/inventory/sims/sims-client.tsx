'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, SimStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Combobox } from '@/components/combobox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Money } from '@/components/money-display'
import { MoneyInput } from '@/components/money-input'
import { SearchInput } from '@/components/search-input'
import { SimStatusBadge } from '@/components/status-badge'
import { TableEmpty } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { confirmAction } from '@/components/confirm'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Sim = {
  id: string
  number: string
  simType: string | null
  purchasePrice: number | null
  purchaseCurrency: Currency | null
  sellingPrice: number | null
  sellingCurrency: Currency | null
  status: SimStatus
  notes: string | null
  supplierId: string | null
  supplier: { id: string; name: string } | null
}
type Supplier = { id: string; name: string }

export function SimsClient({
  initial,
  suppliers,
  canSeeCosts,
}: {
  initial: Sim[]
  suppliers: Supplier[]
  canSeeCosts: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Sim | null>(null)

  const filtered = useMemo(
    () =>
      initial.filter((s) => {
        if (status && s.status !== status) return false
        if (q && !s.number.toLowerCase().includes(q.toLowerCase())) return false
        return true
      }),
    [initial, q, status],
  )

  async function onDelete(s: Sim) {
    if (!confirmAction(`Delete sim ${s.number}?`)) return
    const res = await fetch(`/api/sims/${s.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Sim deleted')
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
            <Label>Search by number</Label>
            <SearchInput value={q} onChange={setQ} placeholder="Sim number" />
          </div>
          <div className="w-44 space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
            </Select>
          </div>
          {canSeeCosts && (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add sim
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              {canSeeCosts && <TableHead>Purchase</TableHead>}
              <TableHead>Selling</TableHead>
              <TableHead>Status</TableHead>
              {canSeeCosts && <TableHead>Supplier</TableHead>}
              {canSeeCosts && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty colSpan={canSeeCosts ? 7 : 4} title="No sim cards found" />}
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-sm">{s.number}</TableCell>
                <TableCell className="text-muted-foreground">{s.simType ?? '-'}</TableCell>
                {canSeeCosts && (
                  <TableCell>
                    <Money amount={s.purchasePrice} currency={s.purchaseCurrency ?? undefined} />
                  </TableCell>
                )}
                <TableCell>
                  <Money amount={s.sellingPrice} currency={s.sellingCurrency ?? undefined} />
                </TableCell>
                <TableCell>
                  <SimStatusBadge status={s.status} />
                </TableCell>
                {canSeeCosts && (
                  <TableCell>{s.supplier?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                )}
                {canSeeCosts && (
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(s)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => onDelete(s)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {canSeeCosts && (
        <SimFormDialog
          key={editing?.id ?? 'new'}
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) setEditing(null)
          }}
          editing={editing}
          suppliers={suppliers}
          onSaved={() => {
            setOpen(false)
            setEditing(null)
            router.refresh()
            toast.success(editing ? 'Sim updated' : 'Sim added')
          }}
        />
      )}
    </>
  )
}

function SimFormDialog({
  open,
  onOpenChange,
  editing,
  suppliers,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Sim | null
  suppliers: Supplier[]
  onSaved: () => void
}) {
  const [number, setNumber] = useState(editing?.number ?? '')
  const [simType, setSimType] = useState(editing?.simType ?? '')
  const [purchasePrice, setPurchasePrice] = useState(editing?.purchasePrice?.toString() ?? '')
  const [purchaseCurrency, setPurchaseCurrency] = useState<Currency>(editing?.purchaseCurrency ?? 'W')
  const [sellingPrice, setSellingPrice] = useState(editing?.sellingPrice?.toString() ?? '')
  const [sellingCurrency, setSellingCurrency] = useState<Currency>(editing?.sellingCurrency ?? 'W')
  const [status, setStatus] = useState<SimStatus>(editing?.status ?? 'AVAILABLE')
  const [supplierId, setSupplierId] = useState(editing?.supplierId ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload: any = {
      number,
      simType: simType || null,
      purchasePrice,
      purchaseCurrency,
      sellingPrice: sellingPrice === '' ? null : sellingPrice,
      sellingCurrency: sellingPrice === '' ? null : sellingCurrency,
      status,
      supplierId: supplierId || null,
      notes: notes || null,
    }
    const res = editing
      ? await fetch(`/api/sims/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/sims`, {
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
          <DialogTitle>{editing ? 'Edit sim' : 'Add sim'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Number</Label>
              <Input required value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type (optional)</Label>
              <Input
                value={simType ?? ''}
                onChange={(e) => setSimType(e.target.value)}
                placeholder="prepaid / postpaid"
              />
            </div>
          </div>
          <MoneyInput
            label="Purchase price"
            amount={purchasePrice}
            currency={purchaseCurrency}
            onAmount={setPurchasePrice}
            onCurrency={setPurchaseCurrency}
            required
          />
          <MoneyInput
            label="Selling price (optional)"
            amount={sellingPrice}
            currency={sellingCurrency}
            onAmount={setSellingPrice}
            onCurrency={setSellingCurrency}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as SimStatus)}>
                <option value="AVAILABLE">Available</option>
                <option value="SOLD">Sold</option>
              </Select>
            </div>
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
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
