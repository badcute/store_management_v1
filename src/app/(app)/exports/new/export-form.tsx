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
import { Trash2, Smartphone, CreditCard, Package, AlertCircle, Wallet, Save, UserRound } from 'lucide-react'

type Client = { id: string; name: string; outstandingW?: number }
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

type PhoneRow = { itemType: 'PHONE'; phoneId: string; unitPrice: string; currency: Currency }
type SimRow = { itemType: 'SIM'; simCardId: string; unitPrice: string; currency: Currency }
type AccRow = { itemType: 'ACCESSORY'; accessoryId: string; quantity: string; unitPrice: string; currency: Currency }
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
  return (Number(it.unitPrice) || 0) * rowQty(it)
}

export function ExportForm({
  clients,
  phones,
  sims,
  accessories,
  rates,
}: {
  clients: Client[]
  phones: PhoneOpt[]
  sims: SimOpt[]
  accessories: AccOpt[]
  rates: RateMap
}) {
  const router = useRouter()
  const toast = useToast()
  const [clientId, setClientId] = useState('')
  const [exportDate, setExportDate] = useState(todayLocalISO())
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Row[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [includeInitialPayment, setIncludeInitialPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState<Currency>('W')
  const [paymentNotes, setPaymentNotes] = useState('')

  const selectedClient = clients.find((c) => c.id === clientId)
  const usedPhoneIds = new Set(
    items
      .filter((i): i is PhoneRow => i.itemType === 'PHONE')
      .map((i) => i.phoneId)
      .filter(Boolean),
  )
  const usedSimIds = new Set(
    items
      .filter((i): i is SimRow => i.itemType === 'SIM')
      .map((i) => i.simCardId)
      .filter(Boolean),
  )

  // Live totals
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
    return convertToW(Number(paymentAmount) || 0, paymentCurrency, rates)
  }, [includeInitialPayment, paymentAmount, paymentCurrency, rates])

  const outstandingW = Math.max(0, totals.totalW - paymentW)

  function addItem(type: ItemType) {
    setErr(null)
    if (type === 'PHONE') setItems((cur) => [...cur, { itemType: 'PHONE', phoneId: '', unitPrice: '', currency: 'W' }])
    if (type === 'SIM') setItems((cur) => [...cur, { itemType: 'SIM', simCardId: '', unitPrice: '', currency: 'W' }])
    if (type === 'ACCESSORY')
      setItems((cur) => [
        ...cur,
        { itemType: 'ACCESSORY', accessoryId: '', quantity: '1', unitPrice: '', currency: 'W' },
      ])
  }
  function updateItem(idx: number, patch: Partial<Row>) {
    setItems((cur) => cur.map((it, i) => (i === idx ? ({ ...it, ...patch } as Row) : it)))
  }
  function removeItem(idx: number) {
    setItems((cur) => cur.filter((_, i) => i !== idx))
  }

  function onSelectPhone(idx: number, phoneId: string | null) {
    const p = phones.find((x) => x.id === phoneId)
    updateItem(idx, {
      phoneId: phoneId ?? '',
      unitPrice: p?.sellingPrice?.toString() ?? '',
      currency: p?.sellingCurrency ?? 'W',
    } as Partial<Row>)
  }
  function onSelectSim(idx: number, simCardId: string | null) {
    const s = sims.find((x) => x.id === simCardId)
    updateItem(idx, {
      simCardId: simCardId ?? '',
      unitPrice: s?.sellingPrice?.toString() ?? '',
      currency: s?.sellingCurrency ?? 'W',
    } as Partial<Row>)
  }
  function onSelectAccessory(idx: number, accessoryId: string | null) {
    const a = accessories.find((x) => x.id === accessoryId)
    updateItem(idx, {
      accessoryId: accessoryId ?? '',
      unitPrice: a?.sellingPricePerBox?.toString() ?? '',
      currency: a?.sellingCurrency ?? 'W',
    } as Partial<Row>)
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
      clientId: clientId || null,
      exportDate,
      notes: notes || null,
      items: items.map((it) => {
        if (it.itemType === 'PHONE')
          return { itemType: 'PHONE', phoneId: it.phoneId, unitPrice: it.unitPrice, currency: it.currency }
        if (it.itemType === 'SIM')
          return { itemType: 'SIM', simCardId: it.simCardId, unitPrice: it.unitPrice, currency: it.currency }
        return {
          itemType: 'ACCESSORY',
          accessoryId: it.accessoryId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          currency: it.currency,
        }
      }),
    }
    if (includeInitialPayment && paymentAmount) {
      payload.initialPayment = { amount: paymentAmount, currency: paymentCurrency, notes: paymentNotes || null }
    }
    const res = await fetch('/api/exports', {
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
    toast.success('Sale recorded')
    router.push(`/exports/${created.id}`)
    router.refresh()
  }

  const hasClientDebt = selectedClient && (selectedClient.outstandingW ?? 0) > 0.01

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-28">
      {/* ---------- Header ---------- */}
      <Card className="surface-hover">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-primary" /> Client &amp; date
          </CardTitle>
          <CardDescription>Who's buying and when</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 space-y-1.5">
            <Label>Client</Label>
            <Combobox
              value={clientId || null}
              onChange={(v) => setClientId(v ?? '')}
              options={clients.map((c) => ({
                value: c.id,
                label: c.name,
                secondary:
                  c.outstandingW && c.outstandingW > 0.01
                    ? `Outstanding ${Math.round(c.outstandingW).toLocaleString()} W`
                    : undefined,
              }))}
              placeholder="Search client (leave empty for walk-in)…"
              allowEmpty
            />
            {hasClientDebt && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {selectedClient!.name} has{' '}
                <Money amount={selectedClient!.outstandingW!} currency="W" className="font-medium" /> outstanding from
                past sales.
              </p>
            )}
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <Label>Date</Label>
            <DatePicker value={exportDate} onChange={setExportDate} required />
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
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  onClick={() => addItem('PHONE')}
                  disabled={phones.length === 0}
                >
                  <Smartphone className="h-3.5 w-3.5 mr-1" /> Phone
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  onClick={() => addItem('SIM')}
                  disabled={sims.length === 0}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Sim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  onClick={() => addItem('ACCESSORY')}
                  disabled={accessories.length === 0}
                >
                  <Package className="h-3.5 w-3.5 mr-1" /> Accessory
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  { t: 'PHONE' as const, count: phones.length, hint: 'available phones' },
                  { t: 'SIM' as const, count: sims.length, hint: 'available sims' },
                  { t: 'ACCESSORY' as const, count: accessories.length, hint: 'accessory types' },
                ] as const
              ).map(({ t, count, hint }) => {
                const meta = TYPE_META[t]
                const Icon = meta.icon
                const disabled = count === 0
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={disabled}
                    onClick={() => addItem(t)}
                    className={cn(
                      'group rounded-xl border-2 border-dashed border-input bg-card/40 transition-all p-6 text-left',
                      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/60 hover:bg-primary/[0.04]',
                    )}
                  >
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-3', meta.tone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-medium">Add {meta.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {count} {hint}
                      {disabled && ' — none available'}
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
            const acc = it.itemType === 'ACCESSORY' ? accessories.find((a) => a.id === it.accessoryId) : null
            const lowStock = acc && acc.boxesInStock <= 2
            return (
              <div key={i} className="border rounded-xl p-4 bg-card/40 space-y-3 relative">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground font-mono w-6">#{i + 1}</span>
                    <Badge variant="outline" className={cn('border-0 gap-1.5', meta.tone)}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                    {lowStock && (
                      <Badge variant="warning" className="text-[10px]">
                        only {acc!.boxesInStock} box{acc!.boxesInStock === 1 ? '' : 'es'} left
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
                    <div className="md:col-span-8 space-y-1.5">
                      <Label>Phone</Label>
                      <Combobox
                        value={it.phoneId || null}
                        onChange={(v) => onSelectPhone(i, v)}
                        options={phones
                          .filter((p) => p.id === it.phoneId || !usedPhoneIds.has(p.id))
                          .map((p) => ({
                            value: p.id,
                            label: `${p.model} — ${p.imei}`,
                            secondary: p.sellingPrice
                              ? `Suggested ${p.sellingPrice} ${p.sellingCurrency}`
                              : 'No suggested price',
                          }))}
                        placeholder="Search by model or IMEI…"
                      />
                    </div>
                  )}
                  {it.itemType === 'SIM' && (
                    <div className="md:col-span-8 space-y-1.5">
                      <Label>Sim card</Label>
                      <Combobox
                        value={it.simCardId || null}
                        onChange={(v) => onSelectSim(i, v)}
                        options={sims
                          .filter((s) => s.id === it.simCardId || !usedSimIds.has(s.id))
                          .map((s) => ({
                            value: s.id,
                            label: s.number,
                            secondary: s.sellingPrice
                              ? `Suggested ${s.sellingPrice} ${s.sellingCurrency}`
                              : 'No suggested price',
                          }))}
                        placeholder="Search by number…"
                      />
                    </div>
                  )}
                  {it.itemType === 'ACCESSORY' && (
                    <>
                      <div className="md:col-span-5 space-y-1.5">
                        <Label>Accessory</Label>
                        <Combobox
                          value={it.accessoryId || null}
                          onChange={(v) => onSelectAccessory(i, v)}
                          options={accessories.map((a) => ({
                            value: a.id,
                            label: a.name,
                            secondary: `${a.boxesInStock} box${a.boxesInStock === 1 ? '' : 'es'} in stock`,
                          }))}
                          placeholder="Search accessory…"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                        <Label>Boxes</Label>
                        <Input
                          type="number"
                          min="1"
                          max={acc ? acc.boxesInStock : undefined}
                          required
                          value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: e.target.value })}
                        />
                        {acc && Number(it.quantity) > acc.boxesInStock && (
                          <p className="text-[11px] text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Exceeds stock of {acc.boxesInStock}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <div className="md:col-span-4">
                    <MoneyInput
                      label={it.itemType === 'ACCESSORY' ? 'Price per box' : 'Unit price'}
                      amount={it.unitPrice}
                      currency={it.currency}
                      onAmount={(v) => updateItem(i, { unitPrice: v })}
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
                <Wallet className="h-4 w-4 text-primary" /> Payment received
              </CardTitle>
              <CardDescription>
                Optional — what the client paid right now. The rest becomes a receivable.
              </CardDescription>
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none rounded-md border px-3 py-1.5 hover:bg-muted">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={includeInitialPayment}
                onChange={(e) => setIncludeInitialPayment(e.target.checked)}
              />
              Receiving now
            </label>
          </div>
        </CardHeader>
        {includeInitialPayment && (
          <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <MoneyInput
                label="Amount received"
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
                placeholder="e.g. cash, transfer ref"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <div className="w-full rounded-md bg-muted px-3 py-2 text-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receivable</p>
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
              {saving ? 'Saving…' : 'Record sale'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
