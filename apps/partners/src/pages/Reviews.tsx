import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
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

function ReviewsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Average Rating Skeleton */}
      <div className="card-v2 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="text-center sm:text-left space-y-2">
            <div className="w-20 h-10 skeleton-shimmer rounded mx-auto sm:mx-0"></div>
            <div className="w-24 h-4 skeleton-shimmer rounded mx-auto sm:mx-0"></div>
          </div>
          <div className="flex-1 w-full space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-4 skeleton-shimmer rounded"></div>
                <div className="flex-1 h-2 skeleton-shimmer rounded-full"></div>
                <div className="w-6 h-4 skeleton-shimmer rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Review Cards Skeleton */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-v2 p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 skeleton-shimmer rounded-full flex-shrink-0"></div>
                <div className="space-y-1">
                  <div className="w-24 h-4 skeleton-shimmer rounded"></div>
                  <div className="w-16 h-3 skeleton-shimmer rounded"></div>
                </div>
              </div>
              <div className="w-12 h-6 skeleton-shimmer rounded-lg flex-shrink-0"></div>
            </div>
            <div className="w-full h-4 skeleton-shimmer rounded mb-1"></div>
            <div className="w-3/4 h-4 skeleton-shimmer rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Reviews() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [filterRating, setFilterRating] = useState<number | null>(null)

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

  const averageRating = (reviews || []).length > 0 
    ? ((reviews || []).reduce((acc, r) => acc + r.rating, 0) / (reviews || []).length).toFixed(1)
    : '0.0'

  const filteredReviews = filterRating !== null
    ? (reviews || []).filter(r => r.rating === filterRating)
    : (reviews || [])

  const sortedReviews = [...filteredReviews].sort((a, b) => {
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
          <Icon
            key={star}
            name="star"
            size={16}
            className={star <= rating ? 'text-ghana-gold' : 'text-gray-200'}
            filled={star <= rating}
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

  const ratingFilters = [
    { label: 'All', value: null },
    { label: '5 ★', value: 5 },
    { label: '4 ★', value: 4 },
    { label: '3 ★', value: 3 },
    { label: '2 ★', value: 2 },
    { label: '1 ★', value: 1 },
  ]

  return (
    <Layout activeTab="reviews">
      <div className="page-enter">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card-v2 text-center py-12 mb-6">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="store" size={40} className="text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can view reviews.
          </p>
          <Link 
            to="/settings" 
            className="btn-primary btn-ripple inline-flex items-center gap-2"
          >
            Create Salon Profile
            <Icon name="arrow_forward" size={20} />
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

      {loading ? (
        <ReviewsSkeleton />
      ) : (
        <>
      {/* Average Rating Card */}
      <div className="card-v2 mb-6 bg-gradient-to-r from-ghana-green/5 to-ghana-gold/5 border-ghana-green/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="text-center sm:text-left">
            <div className="text-4xl sm:text-5xl font-bold text-gray-900">{averageRating}</div>
            <div className="flex items-center justify-center sm:justify-start gap-1 mt-2">
              {renderStars(parseFloat(averageRating))}
            </div>
            <p className="text-sm text-gray-500 mt-1">Based on {(reviews || []).length} reviews</p>
          </div>
          <div className="flex-1 w-full">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = (reviews || []).filter(r => r.rating === star).length
              const percentage = (reviews || []).length > 0 ? (count / (reviews || []).length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2 sm:gap-3 mb-1">
                  <span className="text-sm text-gray-600 w-6 sm:w-8 flex-shrink-0 flex items-center gap-0.5">
                    {star} <Icon name="star" size={12} className="text-ghana-gold" filled />
                  </span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-ghana-gold to-amber-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-6 sm:w-8 text-right flex-shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter & Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        {/* Rating Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
          {ratingFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setFilterRating(filter.value)}
              className={`tab-pill whitespace-nowrap flex-shrink-0 ${
                filterRating === filter.value
                  ? 'tab-pill-active'
                  : 'tab-pill-inactive'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="input-field py-2 px-3 w-full sm:w-auto text-sm"
        >
          <option value="recent">Sort by: Recent</option>
          <option value="highest">Sort by: Highest</option>
          <option value="lowest">Sort by: Lowest</option>
        </select>
      </div>

      {sortedReviews.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
          {sortedReviews.map((review) => (
            <div 
              key={review.id} 
              className="card-v2 border-l-4 border-l-ghana-gold p-4 sm:p-6"
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-ghana-green/20 to-ghana-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-ghana-green font-semibold text-sm">
                      {review.customer?.firstName?.[0]}{review.customer?.lastName?.[0] || ''}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {review.customer?.firstName} {review.customer?.lastName || ''}
                    </h4>
                    <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-ghana-gold/10 px-2.5 py-1 rounded-lg flex-shrink-0">
                  <span className="font-bold text-amber-700 text-sm">{review.rating}</span>
                  <Icon name="star" size={14} className="text-ghana-gold" filled />
                </div>
              </div>
              <div className="mb-2">
                {renderStars(review.rating)}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (reviews || []).length > 0 ? (
        <div className="card-v2 text-center py-12">
          <Icon name="filter_list" size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No {filterRating}-star reviews</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Try selecting a different rating filter to see more reviews.
          </p>
          <button
            onClick={() => setFilterRating(null)}
            className="btn-primary btn-ripple mt-4 inline-flex items-center gap-2"
          >
            Show All Reviews
          </button>
        </div>
      ) : (
        <div className="card-v2 text-center py-16">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="star" size={40} className="text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Reviews will appear here when customers rate your services. Keep providing excellent service!
          </p>
        </div>
      )}
        </>
      )}
        </>
      )}
      </div>
    </Layout>
  )
}
