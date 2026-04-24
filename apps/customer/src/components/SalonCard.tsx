import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

interface SalonCardProps {
  id: string
  businessName: string
  type: string
  rating: number
  reviewCount: number
  city: string
  logo: string | null
  images: string[]
  isSponsored?: boolean
  providerCategory?: string
  priceFrom?: number
  nextAvailable?: string
  variant?: 'horizontal' | 'vertical'
}

export default function SalonCard({
  id,
  businessName,
  type,
  rating,
  reviewCount,
  city,
  logo,
  images,
  isSponsored = false,
  providerCategory,
  priceFrom,
  nextAvailable,
  variant = 'vertical'
}: SalonCardProps) {
  const navigate = useNavigate()
  
  const coverImage = images?.[0] || logo || 'https://images.unsplash.com/photo-1585747860715-2d3b4c7e3a23?w=400&h=300&fit=crop'
  
  const handleClick = () => {
    navigate(`/salon/${id}`)
  }

  if (variant === 'horizontal') {
    return (
      <div
        onClick={handleClick}
        className="flex gap-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md transition-shadow min-w-[300px] flex-shrink-0"
      >
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <img
            src={coverImage}
            alt={businessName}
            className="w-full h-full object-cover rounded-lg"
          />
          {isSponsored && (
            <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-ghana-gold text-ghana-red border border-ghana-gold">
              Sponsored
            </span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm truncate">
              {businessName}
            </h3>
            {providerCategory === 'FREELANCER' && (
              <div className="flex items-center gap-1 mt-0.5">
                <Icon name="person" size={12} className="text-indigo-500" />
                <span className="text-[10px] font-medium text-indigo-500">Freelancer</span>
              </div>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Icon name="star" size={14} filled className="text-yellow-400" />
              <span className="text-xs font-medium">{rating?.toFixed(1) || '0.0'}</span>
              <span className="text-xs text-gray-400">({reviewCount || 0})</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
              <Icon name="location_on" size={12} className="flex-shrink-0" />
              <span className="truncate">{city}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            {priceFrom && (
              <span className="text-xs font-medium text-ghana-red">
                From GHS {priceFrom}
              </span>
            )}
            {nextAvailable && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Icon name="schedule" size={12} />
                <span>{nextAvailable}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Vertical variant (default)
  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow min-w-[260px] flex-shrink-0"
    >
      {/* Cover Image */}
      <div className="relative h-36">
        <img
          src={coverImage}
          alt={businessName}
          className="w-full h-full object-cover"
        />
        {isSponsored && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded bg-ghana-gold text-ghana-red border border-ghana-gold flex items-center gap-1">
            <Icon name="star" size={12} filled className="text-yellow-400" />
            Sponsored
          </span>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm truncate">
          {businessName}
        </h3>
        {providerCategory === 'FREELANCER' && (
          <div className="flex items-center gap-1 mt-0.5">
            <Icon name="person" size={12} className="text-indigo-500" />
            <span className="text-[10px] font-medium text-indigo-500">Freelancer</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-0.5">
            <Icon name="star" size={14} filled className="text-yellow-400" />
            <span className="text-xs font-medium">{rating?.toFixed(1) || '0.0'}</span>
          </div>
          <span className="text-xs text-gray-400">({reviewCount || 0} reviews)</span>
        </div>
        
        <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500">
          <Icon name="location_on" size={14} className="flex-shrink-0" />
          <span className="truncate">{city}</span>
        </div>
        
        {(priceFrom || nextAvailable) && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            {priceFrom && (
              <span className="text-xs font-semibold text-ghana-red">
                From GHS {priceFrom}
              </span>
            )}
            {nextAvailable && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Icon name="schedule" size={12} />
                <span>{nextAvailable}</span>
              </div>
            )}
          </div>
        )}
        
        <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
          {type || 'Salon'}
        </span>
      </div>
    </div>
  )
}
