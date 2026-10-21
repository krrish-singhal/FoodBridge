'use client'

import { useState } from 'react'
import { schedulePickup } from './actions'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SchedulePickupForm({ matchId, foodName }: { matchId: string, foodName: string }) {
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append('matchId', matchId)
    
    const result = await schedulePickup(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else if (result.success) {
      toast.success('Pickup scheduled successfully!')
      setOtp(result.otp!)
    }
    
    setLoading(false)
  }

  if (otp) {
    return (
      <div className="bg-green-50 p-4 rounded-md border border-green-200 mt-4">
        <h4 className="font-semibold text-green-800">Pickup Scheduled!</h4>
        <p className="text-sm text-green-700 mt-1">Please share this OTP with the provider when picking up the food.</p>
        <div className="text-2xl font-mono font-bold tracking-widest text-green-900 mt-3 bg-white p-3 inline-block rounded border border-green-300">
          {otp}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 bg-gray-50 p-4 rounded-md border border-gray-200">
      <h4 className="font-medium text-sm text-gray-900">Schedule Pickup for {foodName}</h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Scheduled Time</label>
          <input type="datetime-local" name="scheduledTime" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Vehicle Details (Optional)</label>
          <input type="text" name="vehicleDetails" placeholder="e.g. White Van AB-1234" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Coordinator Name</label>
          <input type="text" name="coordinatorName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Coordinator Phone</label>
          <input type="tel" name="coordinatorPhone" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border" />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full sm:w-auto justify-center items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Confirm Schedule & Generate OTP
      </button>
    </form>
  )
}
