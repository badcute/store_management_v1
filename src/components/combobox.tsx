'use client'
import * as React from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ComboboxOption = { value: string; label: string; secondary?: string }

/**
 * Autocomplete input modeled after MUI Autocomplete:
 * the control IS a text input. Type to filter, options appear below.
 * Optional X to clear when `allowEmpty` is true and a value is selected.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  allowEmpty,
  disabled,
  id,
  className,
}: {
  value: string | null
  onChange: (v: string | null) => void
  options: ComboboxOption[]
  placeholder?: string
  /** @deprecated retained for backwards compat; not rendered. */
  emptyLabel?: string
  allowEmpty?: boolean
  disabled?: boolean
  id?: string
  className?: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value) ?? null

  const [inputValue, setInputValue] = React.useState(selected?.label ?? '')
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  // `dirty` = the user has typed something that doesn't match the selected label
  const [dirty, setDirty] = React.useState(false)

  // Sync external value -> input
  React.useEffect(() => {
    setInputValue(selected?.label ?? '')
    setDirty(false)
  }, [selected?.label])

  const filtered = React.useMemo(() => {
    if (!dirty || !inputValue) return options
    const q = inputValue.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.secondary?.toLowerCase().includes(q))
  }, [options, inputValue, dirty])

  React.useEffect(() => {
    setHighlight(0)
  }, [filtered])

  // Click outside to close (and revert any uncommitted typing)
  React.useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setInputValue(selected?.label ?? '')
        setDirty(false)
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, selected?.label])

  function commit(opt: ComboboxOption) {
    onChange(opt.value)
    setInputValue(opt.label)
    setDirty(false)
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setInputValue('')
    setDirty(false)
    setOpen(true)
    inputRef.current?.focus()
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setHighlight((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault()
        commit(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setInputValue(selected?.label ?? '')
      setDirty(false)
      setOpen(false)
    } else if (e.key === 'Backspace' && !inputValue && allowEmpty && selected) {
      // Quick clear when input is already empty and user keeps hitting backspace
      clear()
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    setDirty(true)
    setOpen(true)
  }

  function onFocus() {
    setOpen(true)
  }

  function toggleOpen() {
    if (open) {
      setOpen(false)
    } else {
      setOpen(true)
      inputRef.current?.focus()
    }
  }

  const showClear = allowEmpty && selected && !disabled

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div
        className={cn(
          'relative flex h-10 w-full items-center rounded-md border border-input bg-background shadow-soft transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:border-primary',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={onInput}
          onFocus={onFocus}
          onKeyDown={onKey}
          className={cn(
            'flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
            showClear ? 'pr-16' : 'pr-9',
          )}
        />
        <div className="absolute right-0 top-0 h-full flex items-center pr-1 gap-0.5">
          {showClear && (
            <button
              type="button"
              onClick={clear}
              tabIndex={-1}
              aria-label="Clear"
              className="p-1 rounded hover:bg-muted text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleOpen}
            tabIndex={-1}
            aria-label="Toggle options"
            disabled={disabled}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-elevated max-h-64 overflow-y-auto scrollbar-thin py-1 animate-in fade-in-0 zoom-in-95"
          role="listbox"
        >
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</div>
          )}
          {filtered.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onMouseDown={(e) => e.preventDefault()} // keep input focus during click
              onClick={() => commit(opt)}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent text-left',
                i === highlight && 'bg-accent',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn('truncate', value === opt.value && 'font-medium')}>{opt.label}</p>
                {opt.secondary && <p className="text-xs text-muted-foreground truncate">{opt.secondary}</p>}
              </div>
              {value === opt.value && <Check className="h-4 w-4 shrink-0 ml-2 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
