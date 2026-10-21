'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { resetPassword } from './actions'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await resetPassword(formData)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setSuccess(true)
        toast.success('Password successfully reset!')
        setTimeout(() => {
          router.replace('/login')
        }, 2000)
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4">
            <Heart className="h-7 w-7 text-emerald-600 fill-current" />
            <span className="text-2xl font-black text-gray-900 tracking-tight">FoodBridge</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Set New Password</h2>
          <p className="mt-1.5 text-xs text-gray-500">
            Please choose a strong password with at least 8 characters.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-emerald-900">Password Updated!</h3>
            <p className="text-xs text-emerald-800">
              Your password has been securely updated. Redirecting to login...
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Go to Login Now
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative mt-1">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative mt-1">
                <input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save New Password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
