import { SignOutButton } from '@/components/SignOutButton'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/getUser'
import { NotificationBell } from '@/components/NotificationBell'
import { NgoSidebar } from './NgoSidebar'

export default async function NgoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getCurrentUser()
  
  if (!auth) {
    redirect('/login')
  }

  if (auth.profile.role !== 'NGO') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <NgoSidebar userName={auth.profile.full_name || 'NGO Partner'} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-background text-foreground">
        <header className="h-16 bg-card border-b border-border flex items-center justify-end px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4"><SignOutButton /><NotificationBell userId={auth.user.id} /></div>
        </header>
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
