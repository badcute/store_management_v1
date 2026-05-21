import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Sidebar } from '@/components/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect('/login')
  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden app-bg flex flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden md:overflow-y-auto scrollbar-thin animate-slide-up">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
