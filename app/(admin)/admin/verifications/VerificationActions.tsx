'use client'

import { useState } from 'react'
import { updateVerificationStatus } from './actions'
import { Check, X, Loader2 } from 'lucide-react'

export function VerificationActions({
  verificationId,
  organizationId,
}: {
  verificationId: string
  organizationId: string
}) {
  const [loading, setLoading] = useState<false | 'VERIFIED' | 'REJECTED'>(false)

  async function handleVerify() {
    setLoading('VERIFIED')
    try {
      await updateVerificationStatus(verificationId, organizationId, 'VERIFIED')
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  async function handleReject() {
    const reason = window.prompt("Reason for rejection:")
    if (reason === null) return // Cancelled
    
    setLoading('REJECTED')
    try {
      await updateVerificationStatus(verificationId, organizationId, 'REJECTED', reason)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center space-x-2 ml-4">
      <button
        onClick={handleVerify}
        disabled={loading !== false}
        className="inline-flex items-center rounded-md bg-green-50 px-2 py-2 text-sm font-semibold text-green-700 shadow-sm hover:bg-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
        title="Approve Verification"
      >
        {loading === 'VERIFIED' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== false}
        className="inline-flex items-center rounded-md bg-red-50 px-2 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
        title="Reject Verification"
      >
        {loading === 'REJECTED' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </button>
    </div>
  )
}
