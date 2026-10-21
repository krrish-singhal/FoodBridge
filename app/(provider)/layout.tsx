import { SignOutButton } from '@/components/SignOutButton'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/getUser'
import { NotificationBell } from '@/components/NotificationBell'
import { ProviderSidebar } from './ProviderSidebar'

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getCurrentUser()
  
  if (!auth) {
    redirect('/login')
  }

  // Ensure they are a provider
  if (auth.profile.role !== 'PROVIDER') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <ProviderSidebar userName={auth.profile.full_name || 'Provider'} />

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
