'use client'

import { useState } from 'react'
import { acceptMatch, rejectMatch } from './actions'
import { Check, X, Loader2 } from 'lucide-react'

export function MatchActions({
  matchId,
}: {
  matchId: string
}) {
  const [loading, setLoading] = useState<false | 'ACCEPT' | 'REJECT'>(false)

  async function handleAccept() {
    setLoading('ACCEPT')
    try {
      await acceptMatch(matchId)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  async function handleReject() {
    if (!window.confirm("Are you sure you want to reject this match? It will be offered to another NGO.")) return
    
    setLoading('REJECT')
    try {
      await rejectMatch(matchId)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 md:mt-0">
      <button
        onClick={handleAccept}
        disabled={loading !== false}
        className="inline-flex w-full sm:w-auto justify-center items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
      >
        {loading === 'ACCEPT' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
        Accept & Schedule
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== false}
        className="inline-flex w-full sm:w-auto justify-center items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === 'REJECT' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2 text-gray-400" />}
        Decline
      </button>
    </div>
  )
}
