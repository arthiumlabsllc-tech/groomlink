import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import apiClient from '../lib/api'

// Types
interface LoyaltyAccount {
  id: string
  customerId: string
  pointsBalance: number
  lifetimePoints: number
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  pointsToNextTier: number
  nextTier: string | null
}

interface LoyaltyTransaction {
  id: string
  points: number
  type: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE'
  reason: string
  createdAt: string
  bookingId?: string
}

interface TransactionsResponse {
  transactions: LoyaltyTransaction[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Tier configuration with new colors
const tierConfig = {
  BRONZE: {
    color: '#CD7F32',
    gradient: 'from-amber-700 to-amber-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    minPoints: 0,
    perks: ['Earn 1 point per $1 spent', 'Birthday bonus points', 'Exclusive member offers'],
  },
  SILVER: {
    color: '#C0C0C0',
    gradient: 'from-gray-400 to-gray-300',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
    minPoints: 500,
    perks: ['Earn 1.25 points per $1 spent', 'Priority booking', '5% off all services', 'Birthday bonus points'],
  },
  GOLD: {
    color: '#FCD116',
    gradient: 'from-yellow-500 to-yellow-400',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-300',
    minPoints: 1500,
    perks: ['Earn 1.5 points per $1 spent', 'Free service every 10 visits', '10% off all services', 'Priority support'],
  },
  PLATINUM: {
    color: '#E5E4E2',
    gradient: 'from-slate-300 to-slate-200',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    minPoints: 5000,
    perks: ['Earn 2 points per $1 spent', 'Free service every 5 visits', '15% off all services', 'VIP concierge', 'Exclusive events access'],
  },
}

const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']

// Get next tier
const getNextTier = (currentTier: string): string | null => {
  const currentIndex = tierOrder.indexOf(currentTier)
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1]
  }
  return null
}

// Get points needed for tier
const getPointsForTier = (tier: string): number => {
  return tierConfig[tier as keyof typeof tierConfig]?.minPoints || 0
}

// Earn more tips
const earnTips = [
  {
    id: 'book',
    icon: 'calendar_today',
    title: 'Book a Service',
    description: 'Earn points every time you book',
    points: '+10 pts',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'review',
    icon: 'star',
    title: 'Leave a Review',
    description: 'Share your experience',
    points: '+5 pts',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
  },
  {
    id: 'refer',
    icon: 'group',
    title: 'Refer a Friend',
    description: 'When they book their first service',
    points: '+50 pts',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
]

export default function Rewards() {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null)
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [progressAnimated, setProgressAnimated] = useState(0)

  const limit = 10

  // Fetch loyalty account
  const fetchAccount = async () => {
    try {
      const response = await apiClient.get('/loyalty/account')
      setAccount(response.data.data)
    } catch (err) {
      console.error('Error fetching loyalty account:', err)
      setError('Failed to load loyalty account')
    }
  }

  // Fetch transactions
  const fetchTransactions = async (page: number) => {
    try {
      setLoadingTransactions(true)
      const response = await apiClient.get(`/loyalty/transactions?page=${page}&limit=${limit}`)
      const data: TransactionsResponse = response.data.data
      setTransactions(data.transactions)
      setTotalPages(data.meta.totalPages)
      setCurrentPage(data.meta.page)
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([fetchAccount(), fetchTransactions(1)])
      } catch (err) {
        setError('Failed to load rewards data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Animate progress bar after loading
  useEffect(() => {
    if (!loading && account) {
      const targetProgress = calculateProgress()
      const timer = setTimeout(() => {
        setProgressAnimated(targetProgress)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [loading, account])

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchTransactions(page)
    }
  }

  // Calculate progress to next tier
  const calculateProgress = () => {
    if (!account) return 0
    const nextTierName = getNextTier(account.tier)
    if (!nextTierName) return 100
    
    const currentTierPoints = getPointsForTier(account.tier)
    const nextTierPoints = getPointsForTier(nextTierName)
    const pointsInCurrentTier = account.lifetimePoints - currentTierPoints
    const pointsNeededForNextTier = nextTierPoints - currentTierPoints
    
    return Math.min(100, Math.round((pointsInCurrentTier / pointsNeededForNextTier) * 100))
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Get transaction icon
  const getTransactionIcon = (_type: string, points: number) => {
    if (points > 0) {
      return <Icon name="arrow_upward" size={18} className="text-green-500" />
    }
    return <Icon name="arrow_downward" size={18} className="text-red-500" />
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header Skeleton */}
        <div>
          <div className="skeleton-shimmer h-8 w-32 mb-2" />
          <div className="skeleton-shimmer h-4 w-48" />
        </div>
        
        {/* Tier Card Skeleton */}
        <div className="skeleton-shimmer h-64 rounded-2xl" />
        
        {/* Perks Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
          ))}
        </div>
        
        {/* Transactions Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rewards</h1>
          <p className="text-gray-600 mt-1">Your loyalty points and perks</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon name="error" size={48} className="text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const nextTier = account ? getNextTier(account.tier) : null
  const progress = calculateProgress()
  const tierStyle = account ? tierConfig[account.tier] : tierConfig.BRONZE
  const currentPerks = tierStyle.perks

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rewards</h1>
        <p className="text-gray-600 mt-1">Your loyalty points and perks</p>
      </div>

      {/* Tier Display Card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tierStyle.gradient} p-6 sm:p-8 text-white shadow-card-hover`}>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            {/* Left: Tier Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
                <Icon name="emoji_events" size={36} className="text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium uppercase tracking-wider">Current Tier</p>
                <h2 className="text-3xl sm:text-4xl font-bold">{account?.tier || 'BRONZE'}</h2>
              </div>
            </div>
            
            {/* Right: Points Balance */}
            <div className="text-left sm:text-right">
              <p className="text-white/80 text-sm font-medium">Points Balance</p>
              <div className="text-4xl sm:text-5xl font-bold">
                {account?.pointsBalance.toLocaleString() || 0}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          {nextTier && (
            <div className="mt-8">
              <div className="flex justify-between text-sm text-white/90 mb-2">
                <span className="font-medium">{account?.tier}</span>
                <span className="font-medium">{nextTier}</span>
              </div>
              <div className="h-3 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${progressAnimated}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-white/80">
                  <span className="font-semibold text-white">{account?.pointsToNextTier || 0}</span> points to {nextTier}
                </p>
                <span className="text-sm font-bold text-white">{progress}%</span>
              </div>
            </div>
          )}
          
          {!nextTier && (
            <div className="mt-6 flex items-center gap-2 text-white">
              <Icon name="verified" size={24} />
              <p className="font-semibold">Congratulations! You've reached the highest tier!</p>
            </div>
          )}
        </div>
      </div>

      {/* Perks Section */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your {account?.tier} Perks</h2>
        <div className="card-v2 p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentPerks.map((perk, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                  <Icon name="check" size={14} className="text-green-600" />
                </div>
                <span className="text-gray-700 text-sm">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earn More Section */}
      <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Earn More Points</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {earnTips.map((tip) => (
            <div 
              key={tip.id}
              className="card-v2 p-5 flex items-start gap-4"
            >
              <div className={`w-12 h-12 ${tip.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon name={tip.icon} size={24} className={tip.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{tip.title}</h3>
                  <span className="text-xs font-bold text-[#CE1126] bg-primary-50 px-2 py-0.5 rounded-full">
                    {tip.points}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
        
        {transactions.length === 0 ? (
          <div className="card-v2 p-8 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="redeem" size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions yet</h3>
            <p className="text-gray-500">Start booking to earn points!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <div 
                key={transaction.id} 
                className="card-v2 p-4 flex items-center gap-4 animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  transaction.points > 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {getTransactionIcon(transaction.type, transaction.points)}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{transaction.reason}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(transaction.createdAt)}</p>
                </div>
                
                {/* Points */}
                <div className={`text-right`}>
                  <span className={`font-bold text-base ${
                    transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">{transaction.type}</p>
                </div>
              </div>
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loadingTransactions}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="chevron_left" size={16} />
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loadingTransactions}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <Icon name="chevron_right" size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
