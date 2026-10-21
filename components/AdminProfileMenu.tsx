'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronDown, 
  ShieldCheck, 
  LogOut, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  LayoutDashboard,
  User
} from 'lucide-react'
import { logout } from '@/app/(auth)/logout/actions'

interface AdminProfileMenuProps {
  user: {
    id: string
    email?: string | null
    full_name?: string | null
    role?: string | null
  }
}

export function AdminProfileMenu({ user }: AdminProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = user.full_name || 'System Admin'
  const displayEmail = user.email || 'admin@foodbridge.com'
  const initial = (displayName.charAt(0) || 'A').toUpperCase()

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Admin Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-3 p-1.5 pr-3 rounded-full md:rounded-xl border border-gray-200 bg-white hover:bg-gray-50/80 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            {initial}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
        </div>

        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-bold text-gray-900 leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] font-medium text-emerald-700 leading-tight flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5" /> Admin Profile
          </span>
        </div>

        <ChevronDown 
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-gray-700' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu Panel */}
      <div 
        className={`absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white p-2 shadow-xl border border-gray-100 ring-1 ring-black/5 focus:outline-none z-50 transition-all duration-150 ${
          isOpen 
            ? 'opacity-100 scale-100 pointer-events-auto visible' 
            : 'opacity-0 scale-95 pointer-events-none invisible'
        }`}
        role="menu"
        aria-orientation="vertical"
        aria-hidden={!isOpen}
      >
        {/* Admin Header Details */}
        <div className="px-3.5 py-3 border-b border-gray-100 bg-linear-to-b from-gray-50/80 to-transparent rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {displayEmail}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3 h-3 mr-1" /> SYSTEM ADMINISTRATOR
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              Full Access
            </span>
          </div>
        </div>

        {/* Quick Administrative Shortcuts */}
        <div className="py-1.5 space-y-0.5">
          <Link
            href="/admin/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5 mr-2.5 text-gray-400" />
            Platform Dashboard
          </Link>

          <Link
            href="/admin/verifications"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-2.5 text-gray-400" />
            Pending Verifications
          </Link>

          <Link
            href="/admin/reports"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-2.5 text-gray-400" />
            Reports & Analytics
          </Link>

          <Link
            href="/admin/activity"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Activity className="w-3.5 h-3.5 mr-2.5 text-gray-400" />
            System Activity Logs
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-1" />

        {/* Sign Out Action Button inside Profile Menu */}
        <div className="p-1">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 rounded-lg transition-colors cursor-pointer group"
            >
              <span className="flex items-center">
                <LogOut className="w-3.5 h-3.5 mr-2.5 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
                Sign Out / Switch Account
              </span>
              <span className="text-[10px] text-gray-400 font-normal">
                Exit
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
