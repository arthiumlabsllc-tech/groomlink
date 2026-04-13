import { useState, useEffect } from 'react'
import { Star, MessageSquare, Store, ArrowRightCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { useSalon } from '../store/SalonContext'

interface Review {
  id: string
  rating: number
  comment: string
  customer: { firstName: string; lastName?: string }
  createdAt: string
}

type SortOption = 'recent' | 'highest' | 'lowest'

export default function Reviews() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  useEffect(() => {
    const fetchReviews = async () => {
      if (!salonId) return
      try {
        const response = await api.getReviews(salonId)
        if (response.success && response.data) {
          setReviews(Array.isArray(response.data.reviews) ? response.data.reviews : [])
        } else {
          setReviews([])
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [salonId])

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else if (sortBy === 'highest') {
      return b.rating - a.rating
    } else {
      return a.rating - b.rating
    }
  })

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating 
                ? 'text-ghana-gold fill-ghana-gold' 
                : 'text-gray-200'
            }`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <Layout activeTab="reviews">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card text-center py-12 mb-6">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can view reviews.
          </p>
          <Link 
            to="/settings" 
            className="btn-primary inline-flex items-center gap-2"
          >
            Create Salon Profile
            <ArrowRightCircle className="w-5 h-5" />
          </Link>
        </div>
      )}

      {/* Normal Reviews UI - only show if hasSalon is true */}
      {(hasSalon === true || hasSalon === null) && (
        <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-gray-500">Customer feedback and ratings</p>
      </div>

      {/* Average Rating Card */}
      <div className="card mb-6 bg-gradient-to-r from-ghana-green/5 to-ghana-gold/5 border-ghana-green/10">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center sm:text-left">
            <div className="text-5xl font-bold text-gray-900">{averageRating}</div>
            <div className="flex items-center justify-center sm:justify-start gap-1 mt-2">
              {renderStars(parseFloat(averageRating))}
            </div>
            <p className="text-sm text-gray-500 mt-1">Based on {reviews.length} reviews</p>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = (reviews || []).filter(r => r.rating === star).length
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-3 mb-1">
                  <span className="text-sm text-gray-600 w-8">{star} ★</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-ghana-gold rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-gray-600">{reviews.length} reviews</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="input-field py-2 px-3 w-auto text-sm"
        >
          <option value="recent">Sort by: Recent</option>
          <option value="highest">Sort by: Highest</option>
          <option value="lowest">Sort by: Lowest</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading reviews...</p>
        </div>
      ) : sortedReviews.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedReviews.map((review) => (
            <div 
              key={review.id} 
              className="card hover:shadow-md transition-shadow border-l-4 border-l-ghana-gold"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ghana-green/10 rounded-full flex items-center justify-center">
                    <span className="text-ghana-green font-semibold text-sm">
                      {review.customer?.firstName?.[0]}{review.customer?.lastName?.[0] || ''}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {review.customer?.firstName} {review.customer?.lastName || ''}
                    </h4>
                    <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-ghana-gold/10 px-2 py-1 rounded-lg">
                  <span className="font-semibold text-amber-700">{review.rating}</span>
                  <Star className="w-3 h-3 text-ghana-gold fill-ghana-gold" />
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-10 h-10 text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Reviews will appear here when customers rate your services. Keep providing excellent service!
          </p>
        </div>
      )}
        </>
      )}
    </Layout>
  )
}
