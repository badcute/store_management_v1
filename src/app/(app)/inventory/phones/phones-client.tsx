'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, PhoneStatus } from '@prisma/client'
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
import { PhoneStatusBadge } from '@/components/status-badge'
import { TableEmpty } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { confirmAction } from '@/components/confirm'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Phone = {
  id: string
  model: string
  imei: string
  purchasePrice: number | null
  purchaseCurrency: Currency | null
  sellingPrice: number | null
  sellingCurrency: Currency | null
  status: PhoneStatus
  notes: string | null
  supplierId: string | null
  supplier: { id: string; name: string } | null
  createdAt: string
}
type Supplier = { id: string; name: string }

export function PhonesClient({
  initial,
  suppliers,
  canSeeCosts,
}: {
  initial: Phone[]
  suppliers: Supplier[]
  canSeeCosts: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Phone | null>(null)

  const filtered = useMemo(
    () =>
      initial.filter((p) => {
        if (status && p.status !== status) return false
        if (q) {
          const s = q.toLowerCase()
          return p.imei.toLowerCase().includes(s) || p.model.toLowerCase().includes(s)
        }
        return true
      }),
    [initial, q, status],
  )

  async function onDelete(p: Phone) {
    if (!confirmAction(`Delete phone ${p.imei}?`)) return
    const res = await fetch(`/api/phones/${p.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Phone deleted')
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
            <SearchInput value={q} onChange={setQ} placeholder="By IMEI or model" />
          </div>
          <div className="w-44 space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
              <option value="RESERVED">Reserved</option>
              <option value="DEFECTIVE">Defective</option>
            </Select>
          </div>
          {canSeeCosts && (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add phone
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>IMEI</TableHead>
              {canSeeCosts && <TableHead>Purchase</TableHead>}
              <TableHead>Selling</TableHead>
              <TableHead>Status</TableHead>
              {canSeeCosts && <TableHead>Supplier</TableHead>}
              {canSeeCosts && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableEmpty
                colSpan={canSeeCosts ? 7 : 4}
                title="No phones found"
                description={q || status ? 'Try clearing filters.' : 'Add your first phone to get started.'}
              />
            )}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.model}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.imei}</TableCell>
                {canSeeCosts && (
                  <TableCell>
                    <Money amount={p.purchasePrice} currency={p.purchaseCurrency ?? undefined} />
                  </TableCell>
                )}
                <TableCell>
                  <Money amount={p.sellingPrice} currency={p.sellingCurrency ?? undefined} />
                </TableCell>
                <TableCell>
                  <PhoneStatusBadge status={p.status} />
                </TableCell>
                {canSeeCosts && (
                  <TableCell>{p.supplier?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                )}
                {canSeeCosts && (
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(p)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => onDelete(p)}>
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
        <PhoneFormDialog
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
            toast.success(editing ? 'Phone updated' : 'Phone added')
          }}
        />
      )}
    </>
  )
}

function PhoneFormDialog({
  open,
  onOpenChange,
  editing,
  suppliers,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Phone | null
  suppliers: Supplier[]
  onSaved: () => void
}) {
  const [model, setModel] = useState(editing?.model ?? '')
  const [imei, setImei] = useState(editing?.imei ?? '')
  const [purchasePrice, setPurchasePrice] = useState(editing?.purchasePrice?.toString() ?? '')
  const [purchaseCurrency, setPurchaseCurrency] = useState<Currency>(editing?.purchaseCurrency ?? 'W')
  const [sellingPrice, setSellingPrice] = useState(editing?.sellingPrice?.toString() ?? '')
  const [sellingCurrency, setSellingCurrency] = useState<Currency>(editing?.sellingCurrency ?? 'W')
  const [status, setStatus] = useState<PhoneStatus>(editing?.status ?? 'AVAILABLE')
  const [supplierId, setSupplierId] = useState(editing?.supplierId ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload: any = {
      model,
      imei,
      purchasePrice,
      purchaseCurrency,
      sellingPrice: sellingPrice === '' ? null : sellingPrice,
      sellingCurrency: sellingPrice === '' ? null : sellingCurrency,
      status,
      supplierId: supplierId || null,
      notes: notes || null,
    }
    const res = editing
      ? await fetch(`/api/phones/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/phones`, {
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
          <DialogTitle>{editing ? 'Edit phone' : 'Add phone'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input required value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 14" />
            </div>
            <div className="space-y-1.5">
              <Label>IMEI</Label>
              <Input required value={imei} onChange={(e) => setImei(e.target.value)} placeholder="15-digit IMEI" />
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
              <Select value={status} onChange={(e) => setStatus(e.target.value as PhoneStatus)}>
                <option value="AVAILABLE">Available</option>
                <option value="SOLD">Sold</option>
                <option value="RESERVED">Reserved</option>
                <option value="DEFECTIVE">Defective</option>
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
