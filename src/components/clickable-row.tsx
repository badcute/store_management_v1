'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * A table row that navigates to `href` when clicked anywhere.
 * Clicks on interactive children (Button, Link, etc.) won't trigger navigation
 * as long as those handlers call `e.stopPropagation()`, OR rely on the
 * "interactive descendant" check below which ignores clicks originating from
 * buttons / anchors / inputs.
 */
export function ClickableRow({
  href,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { href: string }) {
  const router = useRouter()

  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    // Ignore clicks that originated inside interactive elements.
    const target = e.target as HTMLElement
    if (target.closest("button, a, input, select, textarea, [role='menuitem']")) return
    router.push(href)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      router.push(href)
    }
  }

  return (
    <TableRow
      onClick={handleClick}
      onKeyDown={handleKey}
      role="link"
      tabIndex={0}
      className={cn('cursor-pointer', className)}
      {...props}
    >
      {children}
    </TableRow>
  )
}
