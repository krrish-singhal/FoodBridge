'use client'

import { useState } from 'react'
import { Check, X, Loader2, MessageSquare } from 'lucide-react'
import { acceptNgoRequest, declineNgoRequest } from './actions'
import { toast } from 'sonner'
import Link from 'next/link'

export function ProviderMatchActions({
  donationId,
  matchId,
  matchStatus,
}: {
  donationId: string
  matchId: string
  matchStatus: string
}) {
  const [loading, setLoading] = useState<'ACCEPT' | 'DECLINE' | false>(false)

  async function handleAccept() {
    setLoading('ACCEPT')
    try {
      const res = await acceptNgoRequest(donationId, matchId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('NGO request accepted! A pickup can now be scheduled.')
      }
    } catch {
      toast.error('An error occurred while accepting request.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline() {
    if (!window.confirm('Are you sure you want to decline this NGO request?')) return
    setLoading('DECLINE')
    try {
      const res = await declineNgoRequest(donationId, matchId)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.info('NGO request declined.')
      }
    } catch {
      toast.error('An error occurred while declining request.')
    } finally {
      setLoading(false)
    }
  }

  if (matchStatus === 'ACCEPTED') {
    return (
      <div className="flex items-center space-x-3">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          <Check className="w-3.5 h-3.5 mr-1" /> Accepted Match
        </span>
        <Link
          href="/provider/messages"
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1 text-gray-500" /> Message NGO
        </Link>
      </div>
    )
  }

  if (matchStatus === 'REJECTED') {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        Declined
      </span>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleAccept}
        disabled={loading !== false}
        className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading === 'ACCEPT' ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
        Accept & Assign
      </button>
      <button
        onClick={handleDecline}
        disabled={loading !== false}
        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === 'DECLINE' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5 text-gray-400" />}
      </button>
    </div>
  )
}
