'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, ItemType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Money } from '@/components/money-display'
import { MoneyInput } from '@/components/money-input'
import { useToast } from '@/components/toast'
import { confirmAction } from '@/components/confirm'
import { Plus, Trash2, Smartphone, CreditCard, Package } from 'lucide-react'
import { convertToW } from '@/lib/currency'

type Item = {
  id: string
  itemType: ItemType
  quantity: number
  unitPrice: number
  currency: Currency
  phone: { id: string; model: string; imei: string } | null
  simCard: { id: string; number: string } | null
  accessory: { id: string; name: string } | null
}
type PhoneOpt = {
  id: string
  model: string
  imei: string
  sellingPrice: number | null
  sellingCurrency: Currency | null
}
type SimOpt = { id: string; number: string; sellingPrice: number | null; sellingCurrency: Currency | null }
type AccOpt = {
  id: string
  name: string
  boxesInStock: number
  sellingPricePerBox: number | null
  sellingCurrency: Currency | null
}

export function ExportItemsEditor({
  exportId,
  items,
  phones,
  sims,
  accessories,
  rates,
}: {
  exportId: string
  items: Item[]
  phones: PhoneOpt[]
  sims: SimOpt[]
  accessories: AccOpt[]
  rates: Record<Currency, number>
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  async function onDeleteItem(item: Item) {
    const label = item.phone ? item.phone.imei : item.simCard ? item.simCard.number : (item.accessory?.name ?? 'item')
    if (!confirmAction(`Remove ${label} from this sale? It will be put back in stock.`)) return
    const res = await fetch(`/api/exports/${exportId}/items/${item.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Item removed')
      router.refresh()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error('Remove failed', j.error)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Items ({items.length})</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add item
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Unit price</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">In W</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => {
            const sub = it.unitPrice * it.quantity
            const subW = convertToW(it.unitPrice, it.currency, rates) * it.quantity
            return (
              <TableRow key={it.id}>
                <TableCell>
                  <Badge variant="secondary">{it.itemType}</Badge>
                </TableCell>
                <TableCell>
                  {it.phone && (
                    <span>
                      <span className="font-medium">{it.phone.model}</span>{' '}
                      <span className="font-mono text-xs text-muted-foreground ml-2">{it.phone.imei}</span>
                    </span>
                  )}
                  {it.simCard && <span className="font-mono">{it.simCard.number}</span>}
                  {it.accessory && <span>{it.accessory.name}</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                <TableCell>
                  <Money amount={it.unitPrice} currency={it.currency} />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={sub} currency={it.currency} />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={subW} currency="W" />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon-sm" variant="ghost" onClick={() => onDeleteItem(it)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AddExportItemDialog
        open={open}
        onOpenChange={setOpen}
        exportId={exportId}
        phones={phones}
        sims={sims}
        accessories={accessories}
        onAdded={() => {
          setOpen(false)
          router.refresh()
          toast.success('Item added')
        }}
      />
    </>
  )
}

function AddExportItemDialog({
  open,
  onOpenChange,
  exportId,
  phones,
  sims,
  accessories,
  onAdded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  exportId: string
  phones: PhoneOpt[]
  sims: SimOpt[]
  accessories: AccOpt[]
  onAdded: () => void
}) {
  const [type, setType] = useState<ItemType>('PHONE')
  const [phoneId, setPhoneId] = useState('')
  const [simCardId, setSimCardId] = useState('')
  const [accessoryId, setAccessoryId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [currency, setCurrency] = useState<Currency>('W')
  const [phoneSearch, setPhoneSearch] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredPhones = useMemo(
    () =>
      phones.filter(
        (p) =>
          !phoneSearch ||
          p.imei.toLowerCase().includes(phoneSearch.toLowerCase()) ||
          p.model.toLowerCase().includes(phoneSearch.toLowerCase()),
      ),
    [phones, phoneSearch],
  )

  function reset() {
    setType('PHONE')
    setPhoneId('')
    setSimCardId('')
    setAccessoryId('')
    setQuantity('1')
    setUnitPrice('')
    setCurrency('W')
    setPhoneSearch('')
    setErr(null)
  }

  function onPickPhone(id: string) {
    setPhoneId(id)
    const p = phones.find((x) => x.id === id)
    if (p) {
      setUnitPrice(p.sellingPrice?.toString() ?? '')
      setCurrency(p.sellingCurrency ?? 'W')
    }
  }
  function onPickSim(id: string) {
    setSimCardId(id)
    const s = sims.find((x) => x.id === id)
    if (s) {
      setUnitPrice(s.sellingPrice?.toString() ?? '')
      setCurrency(s.sellingCurrency ?? 'W')
    }
  }
  function onPickAccessory(id: string) {
    setAccessoryId(id)
    const a = accessories.find((x) => x.id === id)
    if (a) {
      setUnitPrice(a.sellingPricePerBox?.toString() ?? '')
      setCurrency(a.sellingCurrency ?? 'W')
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    let item: any
    if (type === 'PHONE') item = { itemType: 'PHONE', phoneId, unitPrice, currency }
    else if (type === 'SIM') item = { itemType: 'SIM', simCardId, unitPrice, currency }
    else item = { itemType: 'ACCESSORY', accessoryId, quantity, unitPrice, currency }
    const res = await fetch(`/api/exports/${exportId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [item] }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Add failed')
      return
    }
    reset()
    onAdded()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add item to sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'PHONE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setType('PHONE')}
            >
              <Smartphone className="h-3.5 w-3.5 mr-1" /> Phone
            </Button>
            <Button
              type="button"
              variant={type === 'SIM' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setType('SIM')}
            >
              <CreditCard className="h-3.5 w-3.5 mr-1" /> Sim
            </Button>
            <Button
              type="button"
              variant={type === 'ACCESSORY' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setType('ACCESSORY')}
            >
              <Package className="h-3.5 w-3.5 mr-1" /> Accessory
            </Button>
          </div>
          {type === 'PHONE' && (
            <>
              <Input
                placeholder="Filter by IMEI/model…"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
              />
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Select required value={phoneId} onChange={(e) => onPickPhone(e.target.value)}>
                  <option value="">: Choose phone :</option>
                  {filteredPhones.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.model} : {p.imei}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
          {type === 'SIM' && (
            <div className="space-y-1.5">
              <Label>Sim</Label>
              <Select required value={simCardId} onChange={(e) => onPickSim(e.target.value)}>
                <option value="">: Choose sim :</option>
                {sims.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {type === 'ACCESSORY' && (
            <>
              <div className="space-y-1.5">
                <Label>Accessory</Label>
                <Select required value={accessoryId} onChange={(e) => onPickAccessory(e.target.value)}>
                  <option value="">: Choose :</option>
                  {accessories.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.boxesInStock} box{a.boxesInStock === 1 ? '' : 'es'})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Boxes</Label>
                <Input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </>
          )}
          <MoneyInput
            label="Unit price"
            amount={unitPrice}
            currency={currency}
            onAmount={setUnitPrice}
            onCurrency={setCurrency}
            required
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
