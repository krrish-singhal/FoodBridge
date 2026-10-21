'use client'

import { useState } from 'react'
import { CheckCircle2, Star } from 'lucide-react'
import { VerifyOtpForm } from './VerifyOtpForm'
import { UploadProofForm } from './UploadProofForm'
import { RatingModal } from '@/components/RatingModal'

export function ProviderPickupActions({
  pickupId,
  matchId,
  ngoOrgId,
  ngoName,
  pickupStatus,
  hasProof,
}: {
  pickupId: string
  matchId: string
  ngoOrgId: string
  ngoName: string
  pickupStatus: string
  hasProof: boolean
}) {
  const [showRating, setShowRating] = useState(false)

  if (pickupStatus === 'SCHEDULED' || pickupStatus === 'ON_THE_WAY') {
    return (
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 min-w-[280px]">
        <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">Verify Handover OTP</h5>
        <VerifyOtpForm pickupId={pickupId} />
      </div>
    )
  }

  if (['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(pickupStatus)) {
    return (
      <div className="flex flex-col items-end space-y-2 min-w-[220px]">
        <div className="flex items-center text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
          <span className="font-bold text-xs">Handover Verified</span>
        </div>

        <div className="flex items-center space-x-2">
          {!hasProof ? (
            <UploadProofForm pickupId={pickupId} />
          ) : (
            <span className="text-[11px] text-emerald-700 font-medium">Proof verified</span>
          )}

          <button
            onClick={() => setShowRating(true)}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100"
          >
            <Star className="w-3.5 h-3.5 mr-1 text-amber-500 fill-current" />
            Rate NGO
          </button>
        </div>

        <RatingModal
          isOpen={showRating}
          onClose={() => setShowRating(false)}
          matchId={matchId}
          targetOrgId={ngoOrgId}
          targetOrgName={ngoName}
        />
      </div>
    )
  }

  return (
    <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md">
      {pickupStatus}
    </span>
  )
}
