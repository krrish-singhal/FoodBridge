'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { requestPasswordReset } from './actions'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await requestPasswordReset(formData)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setSubmitted(true)
        toast.success('Password reset instructions sent.')
      }
    } catch {
      toast.error('Unable to process request. Please try again.')
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
          <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
          <p className="mt-1.5 text-xs text-gray-500">
            Enter your registered email address and we will send you secure recovery instructions via SMTP.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-emerald-900">Instructions Dispatched</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              If an account is associated with your email, you will receive a secure password reset link shortly. Please check your inbox and spam folders.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Account Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="pl-9 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Password Reset Link
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-800"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
