'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Home, Package, Truck, MessageSquare, Settings } from 'lucide-react'

const navItems = [
  { href: '/provider/dashboard', label: 'Dashboard', icon: Home },
  { href: '/provider/donations', label: 'Donations', icon: Package },
  { href: '/provider/pickups', label: 'Pickups', icon: Truck },
  { href: '/provider/messages', label: 'Messages', icon: MessageSquare },
  { href: '/provider/settings', label: 'Settings', icon: Settings },
]

export function ProviderSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-full md:w-64 bg-white border-r flex flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <Heart className="h-6 w-6 text-green-600 fill-current mr-2" />
        <span className="text-xl font-bold text-gray-900 tracking-tight">FoodBridge</span>
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
                  ? 'text-green-700 bg-green-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon
                className={`mr-3 h-5 w-5 ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
              {userName?.charAt(0) || 'P'}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">{userName}</p>
            <p className="text-xs font-medium text-gray-500">Provider</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
