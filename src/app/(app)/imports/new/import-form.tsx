'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency, ItemType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MoneyInput } from '@/components/money-input'
import { Money } from '@/components/money-display'
import { DatePicker } from '@/components/date-picker'
import { Combobox } from '@/components/combobox'
import { useToast } from '@/components/toast'
import { convertToW, type RateMap } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { Trash2, Plus, Smartphone, CreditCard, Package, Sparkles, AlertCircle, Wallet, Save, Truck } from 'lucide-react'

type Supplier = { id: string; name: string }
type Accessory = { id: string; name: string; countPerBox: number }

type PhoneRow = { itemType: 'PHONE'; model: string; imei: string; unitCost: string; currency: Currency }
type SimRow = { itemType: 'SIM'; number: string; simType: string; unitCost: string; currency: Currency }
type AccRow = {
  itemType: 'ACCESSORY'
  mode: 'existing' | 'new'
  accessoryId: string
  name: string
  countPerBox: string
  quantity: string
  unitCost: string
  currency: Currency
}
type Row = PhoneRow | SimRow | AccRow

const TYPE_META: Record<ItemType, { label: string; icon: typeof Smartphone; tone: string }> = {
  PHONE: { label: 'Phone', icon: Smartphone, tone: 'text-primary bg-primary/10' },
  SIM: { label: 'Sim card', icon: CreditCard, tone: 'text-rose-600 bg-rose-100 dark:bg-rose-950/40' },
  ACCESSORY: { label: 'Accessory', icon: Package, tone: 'text-amber-700 bg-amber-100 dark:bg-amber-950/40' },
}

function todayLocalISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60_000)
  return local.toISOString().slice(0, 10)
}

function rowQty(it: Row): number {
  return it.itemType === 'ACCESSORY' ? Math.max(0, Number(it.quantity) || 0) : 1
}

function rowSubtotal(it: Row): number {
  const cost = Number(it.unitCost) || 0
  return cost * rowQty(it)
}

export function ImportForm({
  suppliers,
  accessories,
  rates,
}: {
  suppliers: Supplier[]
  accessories: Accessory[]
  rates: RateMap
}) {
  const router = useRouter()
  const toast = useToast()
  const [supplierId, setSupplierId] = useState('')
  const [importDate, setImportDate] = useState(todayLocalISO())
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [includeInitialPayment, setIncludeInitialPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('W')
  const [paymentNotes, setPaymentNotes] = useState('')

  // Totals per currency + grand total in W
  const totals = useMemo(() => {
    const byCurrency: Record<Currency, number> = { W: 0, U: 0, Y: 0 }
    let totalW = 0
    for (const it of items) {
      const sub = rowSubtotal(it)
      byCurrency[it.currency] += sub
      totalW += convertToW(sub, it.currency, rates)
    }
    const lines = (['W', 'U', 'Y'] as Currency[])
      .filter((c) => byCurrency[c] > 0)
      .map((c) => ({ currency: c, amount: byCurrency[c] }))
    return { byCurrency, lines, totalW }
  }, [items, rates])

  const paymentW = useMemo(() => {
    if (!includeInitialPayment) return 0
    const a = Number(paymentAmount) || 0
    return convertToW(a, paymentCurrency, rates)
  }, [includeInitialPayment, paymentAmount, paymentCurrency, rates])

  const outstandingW = Math.max(0, totals.totalW - paymentW)

  function addItem(type: ItemType) {
    setErr(null)
    if (type === 'PHONE')
      setItems((cur) => [...cur, { itemType: 'PHONE', model: '', imei: '', unitCost: '', currency: 'W' }])
    if (type === 'SIM')
      setItems((cur) => [...cur, { itemType: 'SIM', number: '', simType: '', unitCost: '', currency: 'W' }])
    if (type === 'ACCESSORY')
      setItems((cur) => [
        ...cur,
        {
          itemType: 'ACCESSORY',
          mode: accessories.length > 0 ? 'existing' : 'new',
          accessoryId: '',
          name: '',
          countPerBox: '1',
          quantity: '1',
          unitCost: '',
          currency: 'W',
        },
      ])
  }
  function updateItem(idx: number, patch: Partial<Row>) {
    setItems((cur) => cur.map((it, i) => (i === idx ? ({ ...it, ...patch } as Row) : it)))
  }
  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) {
      setErr('Add at least one item before saving')
      return
    }
    setSaving(true)
    setErr(null)
    const payload: Record<string, unknown> = {
      supplierId: supplierId || null,
      importDate,
      notes: notes || null,
      items: items.map((it) => {
        if (it.itemType === 'PHONE')
          return {
            itemType: 'PHONE',
            unitCost: it.unitCost,
            currency: it.currency,
            phone: { model: it.model, imei: it.imei },
          }
        if (it.itemType === 'SIM')
          return {
            itemType: 'SIM',
            unitCost: it.unitCost,
            currency: it.currency,
            sim: { number: it.number, simType: it.simType || null },
          }
        return {
          itemType: 'ACCESSORY',
          quantity: it.quantity,
          unitCost: it.unitCost,
          currency: it.currency,
          accessory:
            it.mode === 'existing' && it.accessoryId
              ? { accessoryId: it.accessoryId }
              : { name: it.name, countPerBox: it.countPerBox },
        }
      }),
    }
    if (includeInitialPayment && paymentAmount) {
      payload.initialPayment = { amount: paymentAmount, currency: paymentCurrency, notes: paymentNotes || null }
    }
    const res = await fetch('/api/imports', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Save failed')
      toast.error('Save failed', j.error)
      return
    }
    const created = await res.json()
    toast.success('Import recorded')
    router.push(`/imports/${created.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-28">
      {/* ---------- Header ---------- */}
      <Card className="surface-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" /> Supplier &amp; date
          </CardTitle>
          <CardDescription>Where these goods came from and when they arrived</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 space-y-1.5">
            <Label>Supplier</Label>
            <Combobox
              value={supplierId || null}
              onChange={(v) => setSupplierId(v ?? '')}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Search supplier…"
              allowEmpty
            />
            <p className="text-xs text-muted-foreground">Leave empty for unattributed imports.</p>
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label>Import date</Label>
            <DatePicker value={importDate} onChange={setImportDate} required />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </CardContent>
      </Card>

      {/* ---------- Items ---------- */}
      <Card className="surface-hover">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {items.length === 0
                  ? 'Pick a type below to start'
                  : `${items.length} line ${items.length === 1 ? 'item' : 'items'}`}
              </CardDescription>
            </div>
            {items.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Button type="button" size="sm" variant="soft" onClick={() => addItem('PHONE')}>
                  <Smartphone className="h-3.5 w-3.5 mr-1" /> Phone
                </Button>
                <Button type="button" size="sm" variant="soft" onClick={() => addItem('SIM')}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Sim
                </Button>
                <Button type="button" size="sm" variant="soft" onClick={() => addItem('ACCESSORY')}>
                  <Package className="h-3.5 w-3.5 mr-1" /> Accessory
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['PHONE', 'SIM', 'ACCESSORY'] as ItemType[]).map((t) => {
                const meta = TYPE_META[t]
                const Icon = meta.icon
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addItem(t)}
                    className="group rounded-xl border-2 border-dashed border-input hover:border-primary/60 bg-card/40 hover:bg-primary/[0.04] transition-all p-6 text-left"
                  >
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-3', meta.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-medium">Add {meta.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t === 'PHONE' && 'Single unit by IMEI'}
                      {t === 'SIM' && 'Single unit by number'}
                      {t === 'ACCESSORY' && 'Existing or new, by box'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {items.map((it, i) => {
            const meta = TYPE_META[it.itemType]
            const Icon = meta.icon
            const sub = rowSubtotal(it)
            return (
              <div key={i} className="border rounded-xl p-4 bg-card/40 space-y-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground font-mono w-6">#{i + 1}</span>
                    <Badge variant="outline" className={cn('border-0 gap-1.5', meta.tone)}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                    {it.itemType === 'ACCESSORY' && it.mode === 'new' && (
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> new
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {sub > 0 && (
                      <span className="text-sm tabular-nums hidden sm:inline">
                        <Money amount={sub} currency={it.currency} />
                      </span>
                    )}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeItem(i)}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {it.itemType === 'PHONE' && (
                    <>
                      <div className="md:col-span-4 space-y-1.5">
                        <Label>Model</Label>
                        <Input
                          required
                          value={it.model}
                          onChange={(e) => updateItem(i, { model: e.target.value })}
                          placeholder="e.g. iPhone 14"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1.5">
                        <Label>IMEI</Label>
                        <Input
                          required
                          value={it.imei}
                          onChange={(e) => updateItem(i, { imei: e.target.value })}
                          placeholder="15-digit IMEI"
                          inputMode="numeric"
                        />
                      </div>
                    </>
                  )}
                  {it.itemType === 'SIM' && (
                    <>
                      <div className="md:col-span-4 space-y-1.5">
                        <Label>Number</Label>
                        <Input
                          required
                          value={it.number}
                          onChange={(e) => updateItem(i, { number: e.target.value })}
                          placeholder="Sim number"
                        />
                      </div>
                      <div className="md:col-span-4 space-y-1.5">
                        <Label>Type (optional)</Label>
                        <Input
                          value={it.simType}
                          onChange={(e) => updateItem(i, { simType: e.target.value })}
                          placeholder="prepaid / postpaid"
                        />
                      </div>
                    </>
                  )}
                  {it.itemType === 'ACCESSORY' && (
                    <>
                      <div className="md:col-span-5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 min-h-5">
                          <Label>Accessory</Label>
                          <div
                            role="tablist"
                            aria-label="Accessory source"
                            className="inline-flex rounded-md border bg-muted/50 p-0.5 text-[11px]"
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={it.mode === 'existing'}
                              disabled={accessories.length === 0}
                              onClick={() =>
                                updateItem(i, {
                                  mode: 'existing',
                                  name: '',
                                  countPerBox: '1',
                                } as Partial<Row>)
                              }
                              className={cn(
                                'px-2 py-0.5 rounded-sm transition-colors',
                                it.mode === 'existing'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground',
                                accessories.length === 0 && 'opacity-50 cursor-not-allowed',
                              )}
                            >
                              Existing
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={it.mode === 'new'}
                              onClick={() =>
                                updateItem(i, {
                                  mode: 'new',
                                  accessoryId: '',
                                } as Partial<Row>)
                              }
                              className={cn(
                                'px-2 py-0.5 rounded-sm transition-colors flex items-center gap-1',
                                it.mode === 'new'
                                  ? 'bg-background text-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                            >
                              <Sparkles className="h-2.5 w-2.5" /> New
                            </button>
                          </div>
                        </div>
                        {it.mode === 'existing' ? (
                          <Combobox
                            value={it.accessoryId || null}
                            onChange={(v) => updateItem(i, { accessoryId: v ?? '' } as Partial<Row>)}
                            options={accessories.map((a) => ({
                              value: a.id,
                              label: a.name,
                              secondary: `${a.countPerBox} per box`,
                            }))}
                            placeholder="Search accessory…"
                          />
                        ) : (
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <Input
                              required
                              value={it.name}
                              onChange={(e) => updateItem(i, { name: e.target.value })}
                              placeholder="e.g. USB-C cable 1m"
                              aria-label="Accessory name"
                            />
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min="1"
                                required
                                value={it.countPerBox}
                                onChange={(e) => updateItem(i, { countPerBox: e.target.value })}
                                className="w-20"
                                aria-label="Items per box"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">/ box</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                        <Label>Boxes received</Label>
                        <Input
                          type="number"
                          min="1"
                          required
                          value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  <div className="md:col-span-4">
                    <MoneyInput
                      label={it.itemType === 'ACCESSORY' ? 'Cost per box' : 'Unit cost'}
                      amount={it.unitCost}
                      currency={it.currency}
                      onAmount={(v) => updateItem(i, { unitCost: v })}
                      onCurrency={(c) => updateItem(i, { currency: c })}
                      required
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ---------- Payment ---------- */}
      <Card className="surface-hover">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Initial payment
              </CardTitle>
              <CardDescription>
                Optional — anything you paid upfront. The rest becomes outstanding debt.
              </CardDescription>
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none rounded-md border px-3 py-1.5 hover:bg-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={includeInitialPayment}
                onChange={(e) => setIncludeInitialPayment(e.target.checked)}
              />
              Paying now
            </label>
          </div>
        </CardHeader>
        {includeInitialPayment && (
          <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <MoneyInput
                label="Amount paid"
                amount={paymentAmount}
                currency={paymentCurrency}
                onAmount={setPaymentAmount}
                onCurrency={setPaymentCurrency}
                required
              />
            </div>
            <div className="md:col-span-5 space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. cash, bank transfer ref"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <div className="w-full rounded-md bg-muted px-3 py-2 text-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Outstanding</p>
                <p className="tabular-nums font-medium">
                  <Money amount={outstandingW} currency="W" emphasis={outstandingW > 0 ? 'danger' : 'success'} />
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {err && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      {/* ---------- Sticky action bar ---------- */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/85 backdrop-blur px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Items</p>
              <p className="font-semibold tabular-nums">{items.length}</p>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
              {totals.lines.length === 0 ? (
                <p className="text-muted-foreground">—</p>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {totals.lines.map((l) => (
                    <span key={l.currency} className="tabular-nums font-medium">
                      <Money amount={l.amount} currency={l.currency} />
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">≈ in W</p>
              <p className="font-semibold tabular-nums">
                <Money amount={totals.totalW} currency="W" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || items.length === 0} size="lg">
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save import'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
