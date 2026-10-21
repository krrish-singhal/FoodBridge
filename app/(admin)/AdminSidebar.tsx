'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Home, Users, Building, ShieldCheck, Activity, BarChart, Package, Truck } from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { href: '/admin/organizations', label: 'Organizations', icon: Building },
  { href: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
  { href: '/admin/donations', label: 'Donations', icon: Package },
  { href: '/admin/pickups', label: 'Pickups', icon: Truck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/activity', label: 'System Activity', icon: Activity },
  { href: '/admin/reports', label: 'Reports', icon: BarChart },
]

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-r flex flex-col text-slate-300">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Heart className="h-6 w-6 text-green-500 fill-current mr-2" />
        <span className="text-xl font-bold text-white tracking-tight">FoodBridge Admin</span>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive
                  ? 'text-white bg-slate-800'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon
                className={`mr-3 h-5 w-5 ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
              {userName?.charAt(0) || 'A'}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{userName}</p>
            <p className="text-xs font-medium text-slate-400">System Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
