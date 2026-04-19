import { useQuery } from '@tanstack/react-query'
import Icon from './Icon'
import apiClient from '../lib/api'

interface BookingsTodayResponse {
  success: boolean
  data: {
    count: number
    date: string
  }
}

async function fetchBookingsToday(): Promise<number> {
  const response = await apiClient.get<BookingsTodayResponse>('/discover/bookings-today')
  return response.data.data.count
}

export default function LiveBookingCounter() {
  const { data: count, isLoading } = useQuery({
    queryKey: ['bookings-today'],
    queryFn: fetchBookingsToday,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  })

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white animate-pulse">
        <div className="h-6 bg-white/20 rounded w-48"></div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-orange-500 to-ghana-red rounded-xl p-4 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon name="local_fire_department" size={20} className="text-yellow-300" />
        </div>
        <div>
          <p className="text-lg font-bold">
            {count?.toLocaleString() || '0'} bookings
          </p>
          <p className="text-sm text-white/90">
            in Ghana today
          </p>
        </div>
      </div>
    </div>
  )
}
