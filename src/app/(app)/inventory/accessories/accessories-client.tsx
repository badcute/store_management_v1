'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Money } from '@/components/money-display'
import { MoneyInput } from '@/components/money-input'
import { SearchInput } from '@/components/search-input'
import { TableEmpty } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { confirmAction } from '@/components/confirm'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Acc = {
  id: string
  name: string
  countPerBox: number
  boxesInStock: number
  purchasePricePerBox: number | null
  purchaseCurrency: Currency | null
  sellingPricePerBox: number | null
  sellingCurrency: Currency | null
  notes: string | null
}

export function AccessoriesClient({ initial, canSeeCosts }: { initial: Acc[]; canSeeCosts: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Acc | null>(null)

  const filtered = useMemo(
    () => initial.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase())),
    [initial, q],
  )

  async function onDelete(a: Acc) {
    if (!confirmAction(`Delete ${a.name}?`)) return
    const res = await fetch(`/api/accessories/${a.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Accessory deleted')
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
            <Label>Search by name</Label>
            <SearchInput value={q} onChange={setQ} />
          </div>
          {canSeeCosts && (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add accessory
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Per box</TableHead>
              <TableHead className="text-right">Boxes</TableHead>
              <TableHead className="text-right">Total items</TableHead>
              {canSeeCosts && <TableHead>Purchase /box</TableHead>}
              <TableHead>Selling /box</TableHead>
              {canSeeCosts && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty colSpan={canSeeCosts ? 7 : 5} title="No accessories" />}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-right tabular-nums">{a.countPerBox}</TableCell>
                <TableCell className="text-right">
                  {a.boxesInStock <= 2 ? (
                    <Badge variant="warning">{a.boxesInStock}</Badge>
                  ) : (
                    <span className="tabular-nums">{a.boxesInStock}</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{a.boxesInStock * a.countPerBox}</TableCell>
                {canSeeCosts && (
                  <TableCell>
                    <Money amount={a.purchasePricePerBox} currency={a.purchaseCurrency ?? undefined} />
                  </TableCell>
                )}
                <TableCell>
                  <Money amount={a.sellingPricePerBox} currency={a.sellingCurrency ?? undefined} />
                </TableCell>
                {canSeeCosts && (
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(a)
                        setOpen(true)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => onDelete(a)}>
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
        <AccFormDialog
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
            toast.success(editing ? 'Accessory updated' : 'Accessory added')
          }}
        />
      )}
    </>
  )
}

function AccFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Acc | null
  onSaved: () => void
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [countPerBox, setCountPerBox] = useState(editing?.countPerBox?.toString() ?? '1')
  const [boxesInStock, setBoxesInStock] = useState(editing?.boxesInStock?.toString() ?? '0')
  const [purchasePricePerBox, setPurchasePricePerBox] = useState(editing?.purchasePricePerBox?.toString() ?? '')
  const [purchaseCurrency, setPurchaseCurrency] = useState<Currency>(editing?.purchaseCurrency ?? 'W')
  const [sellingPricePerBox, setSellingPricePerBox] = useState(editing?.sellingPricePerBox?.toString() ?? '')
  const [sellingCurrency, setSellingCurrency] = useState<Currency>(editing?.sellingCurrency ?? 'W')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload: any = {
      name,
      countPerBox,
      boxesInStock,
      purchasePricePerBox,
      purchaseCurrency,
      sellingPricePerBox: sellingPricePerBox === '' ? null : sellingPricePerBox,
      sellingCurrency: sellingPricePerBox === '' ? null : sellingCurrency,
      notes: notes || null,
    }
    const res = editing
      ? await fetch(`/api/accessories/${editing.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/accessories`, {
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
          <DialogTitle>{editing ? 'Edit accessory' : 'Add accessory'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Items per box</Label>
              <Input
                type="number"
                min="1"
                required
                value={countPerBox}
                onChange={(e) => setCountPerBox(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Boxes in stock</Label>
              <Input
                type="number"
                min="0"
                required
                value={boxesInStock}
                onChange={(e) => setBoxesInStock(e.target.value)}
              />
            </div>
          </div>
          <MoneyInput
            label="Purchase price per box"
            amount={purchasePricePerBox}
            currency={purchaseCurrency}
            onAmount={setPurchasePricePerBox}
            onCurrency={setPurchaseCurrency}
            required
          />
          <MoneyInput
            label="Selling price per box (optional)"
            amount={sellingPricePerBox}
            currency={sellingCurrency}
            onAmount={setSellingPricePerBox}
            onCurrency={setSellingCurrency}
          />
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
