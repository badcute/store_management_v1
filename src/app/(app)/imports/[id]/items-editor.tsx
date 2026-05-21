'use client'
import { useState } from 'react'
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
  unitCost: number
  currency: Currency
  phone: { model: string; imei: string } | null
  simCard: { number: string } | null
  accessory: { id: string; name: string } | null
}
type Accessory = { id: string; name: string; countPerBox: number }

export function ImportItemsEditor({
  importId,
  items,
  accessories,
  rates,
}: {
  importId: string
  items: Item[]
  accessories: Accessory[]
  rates: Record<Currency, number>
}) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  async function onDeleteItem(item: Item) {
    const label = item.phone ? item.phone.imei : item.simCard ? item.simCard.number : (item.accessory?.name ?? 'item')
    if (!confirmAction(`Remove ${label} from this import? Inventory will be reverted.`)) return
    const res = await fetch(`/api/imports/${importId}/items/${item.id}`, { method: 'DELETE' })
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
            <TableHead>Unit cost</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">In W</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => {
            const sub = it.unitCost * it.quantity
            const subW = convertToW(it.unitCost, it.currency, rates) * it.quantity
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
                  <Money amount={it.unitCost} currency={it.currency} />
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

      <AddImportItemDialog
        open={open}
        onOpenChange={setOpen}
        importId={importId}
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

function AddImportItemDialog({
  open,
  onOpenChange,
  importId,
  accessories,
  onAdded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  importId: string
  accessories: Accessory[]
  onAdded: () => void
}) {
  const [type, setType] = useState<ItemType>('PHONE')
  // PHONE
  const [model, setModel] = useState('')
  const [imei, setImei] = useState('')
  // SIM
  const [number, setNumber] = useState('')
  const [simType, setSimType] = useState('')
  // ACCESSORY
  const [accessoryId, setAccessoryId] = useState('')
  const [accName, setAccName] = useState('')
  const [countPerBox, setCountPerBox] = useState('1')
  const [quantity, setQuantity] = useState('1')
  // money
  const [unitCost, setUnitCost] = useState('')
  const [currency, setCurrency] = useState<Currency>('W')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setType('PHONE')
    setModel('')
    setImei('')
    setNumber('')
    setSimType('')
    setAccessoryId('')
    setAccName('')
    setCountPerBox('1')
    setQuantity('1')
    setUnitCost('')
    setCurrency('W')
    setErr(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    let item: any
    if (type === 'PHONE') item = { itemType: 'PHONE', unitCost, currency, phone: { model, imei } }
    else if (type === 'SIM') item = { itemType: 'SIM', unitCost, currency, sim: { number, simType: simType || null } }
    else
      item = {
        itemType: 'ACCESSORY',
        quantity,
        unitCost,
        currency,
        accessory: accessoryId ? { accessoryId } : { name: accName, countPerBox },
      }
    const res = await fetch(`/api/imports/${importId}/items`, {
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
          <DialogTitle>Add item to import</DialogTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input required value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>IMEI</Label>
                <Input required value={imei} onChange={(e) => setImei(e.target.value)} />
              </div>
            </div>
          )}
          {type === 'SIM' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Number</Label>
                <Input required value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Input value={simType} onChange={(e) => setSimType(e.target.value)} placeholder="prepaid / postpaid" />
              </div>
            </div>
          )}
          {type === 'ACCESSORY' && (
            <>
              <div className="space-y-1.5">
                <Label>Accessory</Label>
                <Select value={accessoryId} onChange={(e) => setAccessoryId(e.target.value)}>
                  {accessories.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
              {!accessoryId && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>New name</Label>
                    <Input required value={accName} onChange={(e) => setAccName(e.target.value)} />
                  </div>
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
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Boxes</Label>
                <Input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </>
          )}
          <MoneyInput
            label="Unit cost"
            amount={unitCost}
            currency={currency}
            onAmount={setUnitCost}
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
