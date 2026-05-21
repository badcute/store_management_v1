// Chart colors aligned with the Sunset Orange + Rose palette.
// Using direct hex/hsl values (not CSS vars) because Recharts SVG fills
// don't reliably resolve hsl(var(--x)) in all browsers.
export const CHART_COLORS = {
  primary: '#ea580c', // orange-600
  rose: '#f43f5e', // rose-500
  amber: '#f59e0b', // amber-500
  emerald: '#10b981', // emerald-500
  sky: '#0ea5e9', // sky-500
  violet: '#8b5cf6', // violet-500
  red: '#ef4444', // red-500
  slate: '#64748b', // slate-500
}

export const TYPE_COLORS: Record<'PHONE' | 'SIM' | 'ACCESSORY', string> = {
  PHONE: CHART_COLORS.primary,
  SIM: CHART_COLORS.rose,
  ACCESSORY: CHART_COLORS.amber,
}
