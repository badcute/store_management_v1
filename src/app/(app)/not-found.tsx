'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileQuestion, Home, ArrowLeft, Smartphone, CreditCard, Package, Users, Truck } from 'lucide-react'

const SUGGESTED = [
  { href: '/inventory/phones', label: 'Phones', icon: Smartphone },
  { href: '/inventory/sims', label: 'Sim Cards', icon: CreditCard },
  { href: '/inventory/accessories', label: 'Accessories', icon: Package },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
]

export default function AppNotFound() {
  const router = useRouter()
  return (
    <div className="flex items-center justify-center min-h-[70vh] py-12">
      <Card className="max-w-2xl w-full shadow-elevated overflow-hidden">
        <div className="relative h-32 bg-gradient-to-br from-primary via-orange-500 to-rose-500 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_50%)]" />
          <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30">
            <FileQuestion className="h-8 w-8 text-white" />
          </div>
        </div>

        <CardContent className="pt-8 pb-8 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-primary">Error 404</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">We can&apos;t find that</h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            The record you&apos;re looking for doesn&apos;t exist : it may have been deleted, or the link is incorrect.
          </p>

          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go back
            </Button>
            <Button asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" /> Dashboard
              </Link>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-3">Or jump to</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SUGGESTED.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 rounded-md p-3 hover:bg-muted transition-colors text-xs font-medium"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
