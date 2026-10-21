'use client'

import Link from 'next/link'
import { register } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Branding Side */}
      <div className="hidden w-1/2 flex-col justify-center bg-green-600 p-12 text-white xl:flex">
        <div className="max-w-lg xl:max-w-xl">
          <h1 className="text-5xl font-bold tracking-tight text-yellow-400">FoodBridge</h1>
          <p className="mt-6 text-lg leading-relaxed text-green-50">
            Join the movement to eliminate food waste. Connect with local verified NGOs to redistribute surplus food to those in need, seamlessly and securely.
          </p>
          <div className="mt-12 flex items-center space-x-4">
            <div className="rounded-lg bg-green-700/50 p-4 backdrop-blur-sm">
              <p className="text-3xl font-bold text-yellow-400">10k+</p>
              <p className="text-sm font-medium text-green-100">Meals Rescued</p>
            </div>
            <div className="rounded-lg bg-green-700/50 p-4 backdrop-blur-sm">
              <p className="text-3xl font-bold text-yellow-400">500+</p>
              <p className="text-sm font-medium text-green-100">Active Partners</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex w-full items-center justify-center p-4 xl:w-1/2">
        <div className="w-full max-w-2xl space-y-8 rounded-xl bg-white p-8 shadow-lg overflow-y-auto max-h-[90vh]">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create an account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Join FoodBridge to start donating or receiving surplus food.
            </p>
          </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const res = await register(formData);
          if (res?.error) {
            toast.error(res.error);
          } else if (res?.success && res?.redirectTo) {
            router.push(res.redirectTo);
          }
        }} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* User Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">User Details</h3>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></label>
                <input id="fullName" name="fullName" type="text" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address <span className="text-red-500">*</span></label>
                <input id="email" name="email" type="email" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
                <div className="relative mt-1">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} required className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500 focus:outline-none">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password <span className="text-red-500">*</span></label>
                <div className="relative mt-1">
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500 focus:outline-none">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                <input id="phone" name="phone" type="tel" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
              </div>
            </div>

            {/* Organization Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Organization Details</h3>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">I want to... <span className="text-red-500">*</span></label>
                <select
                  id="role"
                  name="role"
                  required
                  onChange={(e) => {
                    if (e.target.value === 'NGO') {
                      router.push('/apply-ngo')
                    }
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm bg-white"
                >
                  <option value="PROVIDER">Donate Surplus Food (Provider)</option>
                  <option value="NGO">Receive Food (NGO - Requires Verification)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  NGOs must be verified by administrators. Selecting NGO will redirect to the vetting form.
                </p>
              </div>

              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">Organization Name <span className="text-red-500">*</span></label>
                <input id="orgName" name="orgName" type="text" required placeholder="e.g. Royal Palace Hotel" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
              </div>

              <div>
                <label htmlFor="orgType" className="block text-sm font-medium text-gray-700">Organization Type <span className="text-red-500">*</span></label>
                <select id="orgType" name="orgType" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm bg-white">
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="EVENT_ORGANIZER">Event Organizer</option>
                  <option value="CATERER">Caterer</option>
                  <option value="SUPERMARKET">Supermarket</option>
                  <option value="OTHER">Other Food Business</option>
                </select>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Street Address <span className="text-red-500">*</span></label>
                <input id="address" name="address" type="text" required placeholder="Building, Street, Area" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                  <input id="city" name="city" type="text" required placeholder="e.g. New Delhi, Mumbai" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label>
                  <input id="country" name="country" type="text" required defaultValue="India" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Create Account
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
            Sign in here
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}
