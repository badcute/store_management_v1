'use client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'

export type CategoryRow = { category: string } & Record<string, any>
export type CategorySeries = { dataKey: string; label: string; color: string }

export function BarCategories({
  data,
  series,
  height = 240,
  formatY,
  layout = 'horizontal',
}: {
  data: CategoryRow[]
  series: CategorySeries[]
  height?: number
  formatY?: (n: number) => string
  layout?: 'horizontal' | 'vertical'
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={layout === 'vertical'}
          horizontal={layout === 'horizontal'}
        />
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey="category"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatY ?? ((n: number) => compact(n))}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tickFormatter={formatY ?? ((n: number) => compact(n))}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => {
            const n = typeof value === 'number' ? value : Number(value)
            return formatY ? formatY(n) : n.toLocaleString()
          }}
        />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {series.map((s) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.label}
            fill={s.color}
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          >
            {series.length === 1 && data.map((d, i) => <Cell key={i} fill={d.color ?? s.color} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function compact(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(Math.round(n))
}
