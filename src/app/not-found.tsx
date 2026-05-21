'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Compass } from 'lucide-react'

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative floating shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/3 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
      </div>

      <div className="relative z-10 max-w-xl w-full text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-elevated mb-6 rotate-6 hover:rotate-0 transition-transform">
          <Compass className="h-8 w-8" />
        </div>

        <h1 className="font-black tracking-tighter leading-none text-[10rem] sm:text-[14rem] gradient-text select-none">
          404
        </h1>

        <p className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">This page wandered off</p>
        <p className="text-muted-foreground mt-3 max-w-md mx-auto">
          The URL you visited doesn&apos;t match any page in{' '}
          <span className="font-semibold gradient-text">badcute</span>. It may have been moved, renamed, or never
          existed.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <Button asChild size="lg">
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" /> Go to dashboard
            </Link>
          </Button>
          <Button size="lg" variant="outline" onClick={() => history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go back
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-10">
          If you think this is a bug, check the URL or contact your admin.
        </p>
      </div>
    </div>
  )
}
