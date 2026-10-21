'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Heart,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Info,
} from 'lucide-react'
import { submitNgoApplication } from './actions'
import { toast } from 'sonner'

export default function ApplyNgoPage() {
  const [loading, setLoading] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<{
    refCode: string
    orgName: string
    email: string
  } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await submitNgoApplication(formData)
      if (res.error) {
        toast.error(res.error)
      } else if (res.success) {
        setSubmittedRef({
          refCode: res.refCode!,
          orgName: res.orgName!,
          email: res.email!,
        })
        toast.success('Application submitted successfully!')
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (submittedRef) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
            <p className="text-sm text-gray-500 mt-2">
              Thank you for applying to partner with FoodBridge. Your organization details have been routed to our verification queue.
            </p>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Application Reference:</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                Under Review
              </span>
            </div>
            <p className="text-2xl font-mono font-extrabold text-emerald-900 tracking-wider">
              {submittedRef.refCode}
            </p>
            <p className="text-xs text-emerald-800 mt-2 font-medium">
              Organization: <strong>{submittedRef.orgName}</strong>
            </p>
            <p className="text-xs text-emerald-800 font-medium">
              Official Email: <strong>{submittedRef.email}</strong>
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-2 text-left bg-gray-50 p-4 rounded-xl">
            <h4 className="font-bold text-gray-700 uppercase tracking-wider">What happens next?</h4>
            <p>1. Our compliance team verifies your registration documents and operating capacity within 24–48 hours.</p>
            <p>2. Once approved, Admin will provision your verified NGO credentials and send an activation link to your official email.</p>
            <p>3. You can then log in to view and claim surplus food donations matching your locality.</p>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex w-full justify-center items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              Return to FoodBridge Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center space-x-2">
            <Heart className="h-8 w-8 text-emerald-600 fill-current" />
            <span className="text-2xl font-black text-gray-900 tracking-tight">FoodBridge</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Apply as a Verified NGO Partner
          </h1>
          <p className="text-sm text-gray-600 max-w-xl mx-auto">
            FoodBridge rigorously vets non-profits to ensure surplus meals reach genuine feeding programs safely. Complete the registration form below for administrative review.
          </p>
        </div>

        {/* Notice Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-blue-900">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Vetting & Account Provisioning Policy</p>
            <p className="mt-0.5 text-blue-800">
              In accordance with Food Safety & Redistribution Standards (REQ-4), NGO portal accounts are exclusively issued by platform administrators following document verification. Submitting this form does not immediately grant portal access.
            </p>
          </div>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8">
          {/* Section 1: Organization Identification */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-emerald-600" /> Organization Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Legal / Registered Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="orgName"
                  required
                  placeholder="e.g. Robin Hood Army / Feeding Hope Foundation"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Registration / Trust / 80G Reference Number
                </label>
                <input
                  type="text"
                  name="registrationNumber"
                  placeholder="e.g. REG-NGO-DL-2024-884"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Official Organization Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="contact@your-ngo.org"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Authorized Representative */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center">
              <Users className="w-4 h-4 mr-2 text-emerald-600" /> Authorized Representative
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Full Name of Representative <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Designation / Role</label>
                <input
                  type="text"
                  name="designation"
                  placeholder="e.g. Program Director / Operations Lead"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Official Phone / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+91 98765 43210"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Physical Location & Logistics */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
              Distribution Hub Location & Logistics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Hub / Shelter Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="Plot 14, Sector 12, Community Center"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="e.g. Mumbai, New Delhi, Bengaluru"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">State / Province</label>
                <input
                  type="text"
                  name="state"
                  placeholder="e.g. Maharashtra, Karnataka"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Postal PIN Code</label>
                <input
                  type="text"
                  name="postalCode"
                  placeholder="e.g. 110001"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Pickup Service Radius (in km)
                </label>
                <select
                  name="operatingRadiusKm"
                  defaultValue="25"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="10">Within 10 km (Local Neighborhood)</option>
                  <option value="25">Within 25 km (Standard City Radius)</option>
                  <option value="50">Within 50 km (Metropolitan Area)</option>
                  <option value="100">Within 100 km (Regional Fleet)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Daily Intake & Feeding Capacity (Meals)
                </label>
                <input
                  type="number"
                  name="capacityMeals"
                  defaultValue="250"
                  min="20"
                  max="10000"
                  className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link href="/login" className="text-xs text-gray-500 hover:text-gray-800">
              Already have an approved account? Sign In
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Application...
                </>
              ) : (
                <>
                  Submit NGO Application <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
