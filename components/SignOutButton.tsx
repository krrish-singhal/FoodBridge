import { logout } from '@/app/(auth)/logout/actions'

export function SignOutButton() {
  return <form action={logout}><button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Sign out / switch account</button></form>
}
