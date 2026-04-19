import { useState, useEffect } from 'react'
import Icon from './Icon'

const STORAGE_KEY = 'groomlink_platform_feedback'

interface FeedbackData {
  rating: number
  comment: string
  submittedAt: string
}

function getStoredFeedback(): FeedbackData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch {
    // Ignore errors
  }
  return null
}

function saveFeedback(feedback: FeedbackData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback))
  } catch {
    // Ignore errors
  }
}

export default function PlatformFeedback() {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [existingFeedback, setExistingFeedback] = useState<FeedbackData | null>(null)

  useEffect(() => {
    const stored = getStoredFeedback()
    if (stored) {
      setExistingFeedback(stored)
    }
  }, [])

  const handleSubmit = () => {
    if (rating === 0) return
    const feedback: FeedbackData = {
      rating,
      comment: comment.trim(),
      submittedAt: new Date().toISOString(),
    }
    saveFeedback(feedback)
    setExistingFeedback(feedback)
    setSubmitted(true)
  }

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setExistingFeedback(null)
    setSubmitted(false)
    setRating(0)
    setComment('')
  }

  const displayRating = hoveredRating || rating
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  // Show existing feedback if already submitted
  if (existingFeedback && !submitted) {
    return (
      <div className="card-v2 p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FCD116]/10 rounded-xl flex items-center justify-center">
            <Icon name="star" size={20} className="text-[#FCD116]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Rate GroomLink</h3>
            <p className="text-sm text-gray-500">Your feedback helps us improve</p>
          </div>
        </div>
        <div className="bg-[#FCD116]/5 border border-[#FCD116]/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Icon
                  key={s}
                  name="star"
                  size={18}
                  filled={s <= existingFeedback.rating}
                  className={s <= existingFeedback.rating ? 'text-[#FCD116]' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {ratingLabels[existingFeedback.rating]}
            </span>
          </div>
          {existingFeedback.comment && (
            <p className="text-sm text-gray-600 mt-2">{existingFeedback.comment}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Submitted {new Date(existingFeedback.submittedAt).toLocaleDateString('en-GH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Submit new feedback
        </button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="card-v2 p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#006B3F]/10 rounded-xl flex items-center justify-center">
            <Icon name="check_circle" size={20} className="text-[#006B3F]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Thank You!</h3>
            <p className="text-sm text-gray-500">We appreciate your feedback</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Your input helps us make GroomLink better for everyone in Ghana. We're always working to improve your experience!
        </p>
      </div>
    )
  }

  return (
    <div className="card-v2 p-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#FCD116]/10 rounded-xl flex items-center justify-center">
          <Icon name="star" size={20} className="text-[#FCD116]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Rate GroomLink</h3>
          <p className="text-sm text-gray-500">How would you rate your experience?</p>
        </div>
      </div>

      {/* Star Rating */}
      <div className="text-center mb-4">
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
                size={32}
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
      <div className="mb-4">
        <textarea
          value={comment}
          onChange={(e) => {
            if (e.target.value.length <= 300) {
              setComment(e.target.value)
            }
          }}
          placeholder="Tell us what you think... (optional)"
          rows={2}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent resize-none text-sm"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/300</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0}
        className="w-full py-2.5 bg-[#006B3F] text-white font-medium rounded-xl hover:bg-[#006B3F]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Icon name="star" size={16} />
        Submit Feedback
      </button>
    </div>
  )
}
