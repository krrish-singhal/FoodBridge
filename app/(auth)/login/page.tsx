'use client'

import Link from 'next/link'
import { login } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })
      if (error) {
        toast.error(error.message)
      }
    } catch {
      toast.error('Google OAuth initialization failed. Please check provider configuration.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Branding Side */}
      <div className="hidden w-1/2 flex-col justify-center bg-emerald-600 p-12 text-white lg:flex">
        <div className="max-w-lg">
          <h1 className="text-5xl font-extrabold tracking-tight text-yellow-400">FoodBridge</h1>
          <p className="mt-6 text-lg leading-relaxed text-emerald-50">
            Join the movement to eliminate food waste. Connect with local verified NGOs to redistribute surplus food to those in need, seamlessly and securely.
          </p>
          <div className="mt-12 flex items-center space-x-4">
            <div className="rounded-xl bg-emerald-700/50 p-4 backdrop-blur-xs">
              <p className="text-3xl font-bold text-yellow-400">20k+</p>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mt-1">Meals Rescued</p>
            </div>
            <div className="rounded-xl bg-emerald-700/50 p-4 backdrop-blur-xs">
              <p className="text-3xl font-bold text-yellow-400">400+</p>
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mt-1">Active Partners</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex w-full items-center justify-center p-4 lg:w-1/2">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Sign in to FoodBridge</h2>
            <p className="mt-2 text-xs text-gray-500">
              Welcome back to the surplus food redistribution platform.
            </p>
          </div>

          {/* Google OAuth Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center space-x-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 focus:outline-none transition-colors"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-gray-100" />
            <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Or with email
            </span>
            <div className="w-full border-t border-gray-100" />
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              setPending(true)
              try {
                const res = await login(formData)
                if (res?.error) {
                  toast.error(res.error)
                } else if (res?.success && res.redirectTo) {
                  toast.success('Successfully logged in!')
                  router.replace(res.redirectTo)
                  router.refresh()
                }
              } catch {
                toast.error('Unable to sign in. Please try again.')
              } finally {
                setPending(false)
              }
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="you@organization.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full flex justify-center items-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            >
              {pending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="pt-2 text-center space-y-2 border-t border-gray-100 text-xs">
            <p className="text-gray-500">
              Food Donor?{' '}
              <Link href="/register" className="font-bold text-emerald-600 hover:underline">
                Register as a Provider
              </Link>
            </p>
            <p className="text-gray-500">
              Non-profit / NGO?{' '}
              <Link href="/apply-ngo" className="font-bold text-emerald-600 hover:underline">
                Apply for Verified NGO Access
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
