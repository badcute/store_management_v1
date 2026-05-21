'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/date-picker'
import { Currency } from '@prisma/client'

export function FinanceFilters({ from, to, cur }: { from?: string; to?: string; cur: Currency }) {
  const router = useRouter()
  const search = useSearchParams()
  const [f, setF] = useState(from ?? '')
  const [t, setT] = useState(to ?? '')
  const [c, setC] = useState<Currency>(cur)

  function apply() {
    const p = new URLSearchParams(search?.toString() ?? '')
    f ? p.set('from', f) : p.delete('from')
    t ? p.set('to', t) : p.delete('to')
    p.set('cur', c)
    router.push(`/finance?${p.toString()}`)
  }
  function clear() {
    setF('')
    setT('')
    setC('W')
    router.push('/finance')
  }

  function preset(days: number) {
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - days)
    setF(from.toISOString().slice(0, 10))
    setT(to.toISOString().slice(0, 10))
  }

  return (
    <Card className="mb-4">
      <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-[180px]">
          <Label>From</Label>
          <DatePicker value={f} onChange={setF} placeholder="Start date" />
        </div>
        <div className="space-y-1 min-w-[180px]">
          <Label>To</Label>
          <DatePicker value={t} onChange={setT} placeholder="End date" />
        </div>
        <div className="space-y-1">
          <Label>Display in</Label>
          <Select value={c} onChange={(e) => setC(e.target.value as Currency)}>
            <option value="W">W</option>
            <option value="U">U</option>
            <option value="Y">Y</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => preset(7)}>
            7d
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => preset(30)}>
            30d
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => preset(90)}>
            90d
          </Button>
          <Button type="button" onClick={apply}>
            Apply
          </Button>
          <Button type="button" variant="ghost" onClick={clear}>
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
