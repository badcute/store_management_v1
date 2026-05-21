'use client'
import * as React from 'react'
import { format, parse, isValid } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Date picker that stores its value as a YYYY-MM-DD string (matches the prior
 * <input type="date"> behavior used across the app).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  required,
  id,
}: {
  value: string // "YYYY-MM-DD" or ""
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  id?: string
}) {
  const [open, setOpen] = React.useState(false)
  const date = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : undefined
  }, [value])

  return (
    <>
      {/* Hidden native input keeps HTML form-required semantics if needed */}
      {required && <input type="hidden" value={value} required readOnly />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn('w-full justify-start font-normal', !date && 'text-muted-foreground', className)}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
            {date ? format(date, 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, 'yyyy-MM-dd'))
                setOpen(false)
              }
            }}
            autoFocus
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
