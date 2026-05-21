'use client'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

export type Slice = { name: string; value: number; color: string }

export function Donut({
  data,
  height = 240,
  innerRadius = 60,
  outerRadius = 90,
  formatValue,
}: {
  data: Slice[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  formatValue?: (n: number) => string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} stroke="hsl(var(--card))" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => {
            const n = typeof value === 'number' ? value : Number(value)
            return [
              `${formatValue ? formatValue(n) : n.toLocaleString()} (${total ? Math.round((n / total) * 100) : 0}%)`,
              name as string,
            ]
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
