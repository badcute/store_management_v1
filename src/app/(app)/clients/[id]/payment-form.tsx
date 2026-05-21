'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/money-input'
import { DatePicker } from '@/components/date-picker'
import { useToast } from '@/components/toast'

export function PaymentForm({ clientId, supplierId }: { clientId?: string; supplierId?: string }) {
  const router = useRouter()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('W')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload = {
      amount,
      currency,
      paymentDate,
      notes: notes || undefined,
      direction: clientId ? 'RECEIVED' : 'PAID',
      clientId,
      supplierId,
    }
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Save failed')
      toast.error('Failed', j.error)
      return
    }
    toast.success('Payment recorded')
    setAmount('')
    setNotes('')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid sm:grid-cols-4 gap-3 items-end">
      <div className="sm:col-span-2">
        <MoneyInput
          label="Amount"
          amount={amount}
          currency={currency}
          onAmount={setAmount}
          onCurrency={setCurrency}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Date</Label>
        <DatePicker value={paymentDate} onChange={setPaymentDate} required />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
      <Button type="submit" disabled={saving} className="sm:col-start-4">
        {saving ? 'Saving…' : 'Record payment'}
      </Button>
      {err && <p className="sm:col-span-4 text-sm text-destructive">{err}</p>}
    </form>
  )
}
