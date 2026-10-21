'use client'

import { useState } from 'react'
import { verifyPickupOtp, markPickupFailed } from './actions'
import { Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export function VerifyOtpForm({ pickupId }: { pickupId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append('pickupId', pickupId)
    
    const result = await verifyPickupOtp(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('OTP verified and pickup completed successfully!')
    }
    
    setLoading(false)
  }

  async function handleMarkFailed() {
    if (confirm('Are you sure you want to mark this pickup as failed? The NGO will be penalized and the donation will be rematched.')) {
      setLoading(true)
      const result = await markPickupFailed(pickupId)
      if (result && result.error) {
        toast.error(result.error)
      } else {
        toast.success('Pickup marked as failed. Re-matching triggered.')
      }
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-center space-x-2">
      <input 
        type="text" 
        name="otp" 
        placeholder="Enter 6-digit OTP" 
        required
        pattern="\d{6}"
        maxLength={6}
        className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex justify-center items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Verify & Handover
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={handleMarkFailed}
        className="inline-flex justify-center items-center rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50 ml-2"
        title="Mark pickup as failed (NGO didn't show up)"
      >
        <XCircle className="w-4 h-4 mr-1" />
        Failed
      </button>
    </form>
  )
}
