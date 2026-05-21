'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Currency } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/toast'

export function RateForm() {
  const router = useRouter()
  const toast = useToast()
  const [code, setCode] = useState<Currency>('U')
  const [rate, setRate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const res = await fetch('/api/currency', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, rateToW: rate, notes: notes || undefined }),
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error || 'Failed')
      return
    }
    toast.success(`${code} rate updated`)
    setRate('')
    setNotes('')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="grid sm:grid-cols-5 gap-3 items-end">
      <div className="space-y-1.5">
        <Label>Currency</Label>
        <Select value={code} onChange={(e) => setCode(e.target.value as Currency)}>
          <option value="U">U</option>
          <option value="Y">Y</option>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>1 unit of {code} = how many W?</Label>
        <Input
          type="number"
          step="0.000001"
          min="0"
          required
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="e.g. 1350"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving…' : 'Save rate'}
      </Button>
      {err && <p className="sm:col-span-5 text-sm text-destructive">{err}</p>}
    </form>
  )
}
