'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Role } from '@prisma/client'
import {
  LayoutDashboard,
  Smartphone,
  CircleDollarSign,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Truck,
  BarChart3,
  Coins,
  Shield,
  ClipboardList,
  LogOut,
  CreditCard,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; minRole?: Role }
type NavSection = { title: string; items: NavItem[] }

const SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Inventory',
    items: [
      { href: '/inventory/phones', label: 'Phones', icon: Smartphone },
      { href: '/inventory/sims', label: 'Sim Cards', icon: CreditCard },
      { href: '/inventory/accessories', label: 'Accessories', icon: Package },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/imports', label: 'Imports', icon: ArrowDownToLine, minRole: Role.MANAGER },
      { href: '/exports', label: 'Exports / Sales', icon: ArrowUpFromLine },
    ],
  },
  {
    title: 'Contacts',
    items: [
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/suppliers', label: 'Suppliers', icon: Truck, minRole: Role.MANAGER },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/payments', label: 'Payments', icon: CircleDollarSign },
      { href: '/currency', label: 'Currency Rates', icon: Coins },
      { href: '/finance', label: 'Reports', icon: BarChart3, minRole: Role.MANAGER },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/users', label: 'Users', icon: Shield, minRole: Role.ADMIN },
      { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, minRole: Role.ADMIN },
    ],
  },
]

const ROLE_RANK: Record<Role, number> = { ADMIN: 3, MANAGER: 2, STAFF: 1 }

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-card/80 backdrop-blur px-4 h-14">
        <Link href="/dashboard" className="font-bold gradient-text text-lg">
          badcute
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-muted">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-0 left-0 z-50 h-full w-72 bg-card border-r md:hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="font-bold gradient-text text-xl">
                badcute
              </Link>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarBody onItemClick={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  )
}

function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card/60 backdrop-blur-sm">
      <div className="px-6 py-5 border-b">
        <Link href="/dashboard" className="flex items-baseline gap-1">
          <span className="text-xl font-bold gradient-text">badcute</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">v1.0</span>
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Phone store management</p>
      </div>
      <SidebarBody />
    </aside>
  )
}

function SidebarBody({ onItemClick }: { onItemClick?: () => void } = {}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role

  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-thin">
        {SECTIONS.map((sec) => {
          const items = sec.items.filter((i) => !i.minRole || (role && ROLE_RANK[role] >= ROLE_RANK[i.minRole]))
          if (items.length === 0) return null
          return (
            <div key={sec.title}>
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {sec.title}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onItemClick}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all relative',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="border-t p-3">
        <div className="px-2 py-2 mb-1 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm">
            {(session?.user?.name ?? 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground">{session?.user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  )
}
