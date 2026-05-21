'use client'
import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import 'react-day-picker/style.css'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaults = getDefaultClassNames()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: cn(defaults.root, 'text-sm'),
        months: cn(defaults.months, 'flex flex-col sm:flex-row gap-4'),
        month: cn(defaults.month, 'space-y-3'),
        month_caption: cn(defaults.month_caption, 'flex justify-center pt-1 relative items-center font-medium'),
        caption_label: cn(defaults.caption_label, 'text-sm'),
        nav: cn(defaults.nav, 'absolute inset-x-1 top-1 flex items-center justify-between z-10'),
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'bg-transparent p-0 opacity-60 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'bg-transparent p-0 opacity-60 hover:opacity-100',
        ),
        month_grid: cn(defaults.month_grid, 'w-full border-collapse mt-2'),
        weekdays: cn(defaults.weekdays, 'flex'),
        weekday: cn(defaults.weekday, 'text-muted-foreground w-9 font-medium text-[0.75rem] uppercase tracking-wide'),
        week: cn(defaults.week, 'flex w-full mt-1'),
        day: cn(defaults.day, 'relative h-9 w-9 p-0 text-center'),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md',
        ),
        selected: cn(
          defaults.selected,
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary',
        ),
        today: cn(defaults.today, '[&>button]:bg-accent [&>button]:text-accent-foreground'),
        outside: cn(defaults.outside, 'text-muted-foreground opacity-50'),
        disabled: cn(defaults.disabled, 'text-muted-foreground opacity-50'),
        hidden: cn(defaults.hidden, 'invisible'),
        dropdowns: cn(defaults.dropdowns, 'flex gap-1.5 items-center'),
        dropdown: cn(defaults.dropdown, 'rounded-md border bg-background text-sm px-1.5 py-1'),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls, ...rest }) => {
          if (orientation === 'left')
            return <ChevronLeft className={cn('h-4 w-4', cls)} {...(rest as React.SVGProps<SVGSVGElement>)} />
          if (orientation === 'right')
            return <ChevronRight className={cn('h-4 w-4', cls)} {...(rest as React.SVGProps<SVGSVGElement>)} />
          return <span />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
