'use client'

import { useState } from 'react'
import { Star, Loader2, X } from 'lucide-react'
import { submitRating } from '@/app/actions/ratings'
import { toast } from 'sonner'

export function RatingModal({
  matchId,
  targetOrgId,
  targetOrgName,
  isOpen,
  onClose,
}: {
  matchId: string
  targetOrgId: string
  targetOrgName: string
  isOpen: boolean
  onClose: () => void
}) {
  const [score, setScore] = useState(5)
  const [hoverScore, setHoverScore] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await submitRating({
        matchId,
        targetOrgId,
        score,
        review,
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Thank you! Your rating has been submitted.')
        onClose()
      }
    } catch {
      toast.error('Failed to submit rating.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">Rate Handover Experience</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Partner</label>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{targetOrgName}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Score (1 to 5 Stars)
            </label>
            <div className="flex items-center space-x-1.5">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setScore(star)}
                  onMouseEnter={() => setHoverScore(star)}
                  onMouseLeave={() => setHoverScore(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverScore || score) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Feedback & Notes (Optional)
            </label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="e.g. Prompt arrival, excellent food temperature, professional handover..."
              rows={3}
              className="w-full text-xs rounded-lg border border-gray-200 p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Submit Rating
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
