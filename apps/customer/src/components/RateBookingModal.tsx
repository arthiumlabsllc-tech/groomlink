import { useState } from 'react'
import Icon from './Icon'
import { bookingApi } from '../lib/api'

interface RateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  salonName: string
  serviceName: string
  onReviewSubmitted: (rating: number) => void
}

export default function RateBookingModal({
  isOpen,
  onClose,
  bookingId,
  salonName,
  serviceName,
  onReviewSubmitted,
}: RateBookingModalProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (rating === 0) return

    setSubmitting(true)
    setError(null)
    try {
      await bookingApi.rateBooking(bookingId, {
        rating,
        comment: comment.trim() || undefined,
      })
      setSubmitted(true)
      onReviewSubmitted(rating)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setRating(0)
      setHoveredRating(0)
      setComment('')
      setSubmitted(false)
      setError(null)
      onClose()
    }
  }

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
  const displayRating = hoveredRating || rating

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-elevated animate-slide-up">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {submitted ? 'Review Submitted!' : 'Rate Your Experience'}
            </h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <Icon name="close" size={20} className="text-gray-500" />
            </button>
          </div>

          {submitted ? (
            /* Success State */
            <div className="text-center py-6 animate-fade-in-up">
              <div className="w-20 h-20 bg-[#006B3F]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="check_circle" size={48} className="text-[#006B3F]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank you for your review!</h3>
              <p className="text-gray-500 text-sm mb-6">
                Your feedback helps other customers find great salons and helps salons improve their service.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-3 bg-[#006B3F] text-white font-medium rounded-xl hover:bg-[#006B3F]/90 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Review Form */
            <div className="space-y-5">
              {/* Booking Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900 text-sm">{salonName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{serviceName}</p>
              </div>

              {/* Star Rating */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">How would you rate this experience?</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Icon
                        name="star"
                        size={36}
                        filled={star <= displayRating}
                        className={`transition-colors ${
                          star <= displayRating ? 'text-[#FCD116]' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {displayRating > 0 && (
                  <p className="text-sm font-medium text-[#006B3F] mt-2 animate-fade-in">
                    {ratingLabels[displayRating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share your experience <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setComment(e.target.value)
                    }
                  }}
                  placeholder="What did you like? Any suggestions for improvement?"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {comment.length}/500
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-fade-in">
                  <Icon name="error" size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || rating === 0}
                  className="flex-1 py-2.5 bg-[#006B3F] text-white rounded-xl hover:bg-[#006B3F]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Icon name="progress_activity" size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Icon name="star" size={16} />
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
