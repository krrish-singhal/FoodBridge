import { SignOutButton } from '@/components/SignOutButton'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/getUser'
import { NotificationBell } from '@/components/NotificationBell'

export default async function CsrLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getCurrentUser()

  if (!auth) {
    redirect('/login')
  }

  if (auth.profile.role !== 'CSR') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-white">FoodBridge</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              CSR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Corporate Impact Portal</p>
        </div>
        <div className="p-4 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Account
          </div>
          <div className="px-3 py-2 text-sm text-slate-300">
            {auth.profile.full_name || 'CSR Partner'}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-background text-foreground">
        <header className="h-16 bg-card border-b border-border flex items-center justify-end px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <SignOutButton />
            <NotificationBell userId={auth.user.id} />
          </div>
        </header>
        <div className="p-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
