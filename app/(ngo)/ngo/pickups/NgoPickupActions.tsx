'use client'

import { useState } from 'react'
import { Check, Star, Loader2, ArrowRight, Truck } from 'lucide-react'
import { updatePickupMilestone } from './actions'
import { RatingModal } from '@/components/RatingModal'
import { toast } from 'sonner'

export function NgoPickupActions({
  pickupId,
  matchId,
  providerOrgId,
  providerName,
  pickupStatus,
  donationStatus,
  otpCode,
  otpExpiresAt,
  isOtpUsed,
}: {
  pickupId: string
  matchId: string
  providerOrgId: string
  providerName: string
  pickupStatus: string
  donationStatus: string
  otpCode?: string
  otpExpiresAt?: string
  isOtpUsed?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [showRating, setShowRating] = useState(false)

  async function handleMilestone(milestone: 'DELIVERED' | 'DISTRIBUTED') {
    setLoading(true)
    try {
      const res = await updatePickupMilestone(pickupId, milestone)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(`Milestone updated: ${milestone}`)
      }
    } catch {
      toast.error('Failed to update milestone')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end space-y-2 mt-3 sm:mt-0">
      {/* Active OTP Card for coordinator */}
      {otpCode && !isOtpUsed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center min-w-[200px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Handover OTP (Share with Donor)
          </span>
          <span className="text-2xl font-mono font-extrabold text-emerald-900 tracking-widest block mt-0.5">
            {otpCode}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
            Provide to kitchen staff at collection
          </span>
        </div>
      )}

      {/* Progress Milestones & Actions */}
      <div className="flex items-center space-x-2">
        {pickupStatus === 'PICKED_UP' && donationStatus !== 'DISTRIBUTED' && (
          <button
            onClick={() => handleMilestone('DELIVERED')}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
            Confirm Delivered to Hub
          </button>
        )}

        {(donationStatus === 'DELIVERED' || pickupStatus === 'DELIVERED') && donationStatus !== 'DISTRIBUTED' && (
          <button
            onClick={() => handleMilestone('DISTRIBUTED')}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
            Confirm Distributed to Beneficiaries
          </button>
        )}

        {/* Rating Button if Handover or Delivery is complete */}
        {['PICKED_UP', 'DELIVERED', 'DISTRIBUTED'].includes(donationStatus) && (
          <button
            onClick={() => setShowRating(true)}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100"
          >
            <Star className="w-3.5 h-3.5 mr-1 text-amber-500 fill-current" />
            Rate Donor
          </button>
        )}
      </div>

      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        matchId={matchId}
        targetOrgId={providerOrgId}
        targetOrgName={providerName}
      />
    </div>
  )
}
