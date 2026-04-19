import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Icon from '../components/Icon'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { useSalon } from '../store/SalonContext'

// Types for insights data
interface PeakHoursData {
  peakDays: { day: string; bookingCount: number }[]
  peakTimeRanges: { start: string; end: string; intensity: 'high' | 'medium' | 'low' }[]
}

interface PricingInsight {
  serviceId: string
  serviceName: string
  yourPrice: number
  marketAverage: number
  difference: number
  percentile: number
}

interface StaffPerformance {
  workerId: string
  workerName: string
  bookings: number
  revenue: number
  rating: number
  completionRate: number
}

interface LoyaltyMetrics {
  repeatCustomerRate: number
  atRiskCustomers: number
  loyalCustomers: number
  averageVisitsPerCustomer: number
}

interface RevenueData {
  period: string
  total: number
  data: { label: string; value: number }[]
}

type Period = 'daily' | 'weekly' | 'monthly'

// API functions
const fetchPeakHours = async (salonId: string): Promise<PeakHoursData> => {
  const response = await api.request<{ success: boolean; data: PeakHoursData }>(`/insights/peak-hours?salonId=${salonId}`)
  return response.data
}

const fetchPricingInsights = async (salonId: string): Promise<PricingInsight[]> => {
  const response = await api.request<{ success: boolean; data: PricingInsight[] }>(`/insights/pricing?salonId=${salonId}`)
  return response.data
}

const fetchStaffPerformance = async (salonId: string): Promise<StaffPerformance[]> => {
  const response = await api.request<{ success: boolean; data: StaffPerformance[] }>(`/insights/staff-performance?salonId=${salonId}`)
  return response.data
}

const fetchLoyaltyMetrics = async (salonId: string): Promise<LoyaltyMetrics> => {
  const response = await api.request<{ success: boolean; data: LoyaltyMetrics }>(`/insights/loyalty-metrics?salonId=${salonId}`)
  return response.data
}

const fetchRevenue = async (salonId: string, period: Period): Promise<RevenueData> => {
  const response = await api.request<{ success: boolean; data: RevenueData }>(`/insights/revenue?salonId=${salonId}&period=${period}`)
  return response.data
}

// Helper components
function ProgressBar({ value, max, colorClass = 'bg-ghana-green' }: { value: number; max: number; colorClass?: string }) {
  const [animatedWidth, setAnimatedWidth] = useState(0)
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(percentage), 100)
    return () => clearTimeout(timer)
  }, [percentage])
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${animatedWidth}%` }}
      />
    </div>
  )
}

function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  
  return (
    <div className="flex items-end gap-2 h-32 mt-4">
      {data.map((item, index) => {
        const height = (item.value / maxValue) * 100
        const colors = ['bg-ghana-green', 'bg-ghana-gold', 'bg-blue-500', 'bg-purple-500', 'bg-ghana-red', 'bg-teal-500']
        const color = colors[index % colors.length]
        
        return (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full ${color} rounded-t-md transition-all duration-500 hover:opacity-80`}
              style={{ height: `${height}%`, minHeight: '4px' }}
              title={`${item.label}: GH₵${item.value}`}
            />
            <span className="text-xs text-gray-500 truncate w-full text-center">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ title, value, subtitle, iconName, trend, gradient = false }: { 
  title: string
  value: string | number
  subtitle?: string
  iconName: string
  trend?: { value: number; isPositive: boolean }
  gradient?: boolean
}) {
  return (
    <div className={`card-v2 p-5 ${gradient ? 'bg-gradient-to-br from-ghana-green/5 to-transparent border border-ghana-green/10' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${gradient ? 'text-gradient' : 'text-gray-900'}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient ? 'bg-ghana-green/15' : 'bg-ghana-green/10'}`}>
          <Icon name={iconName} size={20} className="text-ghana-green" />
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <Icon name={trend.isPositive ? 'trending_up' : 'trending_down'} size={16} />
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  )
}

// Shimmer skeleton components
function StatCardSkeleton() {
  return (
    <div className="card-v2 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="skeleton-shimmer h-4 w-20 mb-2" />
          <div className="skeleton-shimmer h-8 w-24 mb-2" />
          <div className="skeleton-shimmer h-3 w-16" />
        </div>
        <div className="skeleton-shimmer w-10 h-10 rounded-xl" />
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex items-end gap-2 h-32 mt-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="skeleton-shimmer w-full rounded-t-md" style={{ height: `${20 + i * 10}%` }} />
          <div className="skeleton-shimmer h-3 w-8" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 pb-2 border-b border-gray-100">
        <div className="skeleton-shimmer h-4 w-24 flex-1" />
        <div className="skeleton-shimmer h-4 w-16" />
        <div className="skeleton-shimmer h-4 w-16" />
        <div className="skeleton-shimmer h-4 w-12" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          <div className="skeleton-shimmer h-4 w-24 flex-1" />
          <div className="skeleton-shimmer h-4 w-16" />
          <div className="skeleton-shimmer h-4 w-16" />
          <div className="skeleton-shimmer h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

function LoyaltySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card-v2 p-4 text-center">
          <div className="skeleton-shimmer h-8 w-16 mx-auto mb-2" />
          <div className="skeleton-shimmer h-4 w-20 mx-auto mb-1" />
          <div className="skeleton-shimmer h-3 w-24 mx-auto" />
        </div>
      ))}
    </div>
  )
}

export default function Insights() {
  const { salonId } = useSalon()
  const [period, setPeriod] = useState<Period>('weekly')

  // Fetch all insights data
  const { data: peakHours, isLoading: peakHoursLoading } = useQuery({
    queryKey: ['insights', 'peak-hours', salonId],
    queryFn: () => fetchPeakHours(salonId!),
    enabled: !!salonId,
  })

  const { data: pricingInsights, isLoading: pricingLoading } = useQuery({
    queryKey: ['insights', 'pricing', salonId],
    queryFn: () => fetchPricingInsights(salonId!),
    enabled: !!salonId,
  })

  const { data: staffPerformance, isLoading: staffLoading } = useQuery({
    queryKey: ['insights', 'staff-performance', salonId],
    queryFn: () => fetchStaffPerformance(salonId!),
    enabled: !!salonId,
  })

  const { data: loyaltyMetrics, isLoading: loyaltyLoading } = useQuery({
    queryKey: ['insights', 'loyalty', salonId],
    queryFn: () => fetchLoyaltyMetrics(salonId!),
    enabled: !!salonId,
  })

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['insights', 'revenue', salonId, period],
    queryFn: () => fetchRevenue(salonId!, period),
    enabled: !!salonId,
  })

  const isLoading = peakHoursLoading || pricingLoading || staffLoading || loyaltyLoading || revenueLoading

  const periodLabels: Record<Period, string> = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
  }

  return (
    <Layout activeTab="insights">
      <div className="page-enter">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
          <p className="text-gray-500">Analytics and performance metrics for your salon</p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {/* Revenue Overview Skeleton */}
            <div className="card-v2 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="skeleton-shimmer h-6 w-40 mb-2" />
                  <div className="skeleton-shimmer h-4 w-32" />
                </div>
                <div className="flex gap-2">
                  <div className="skeleton-shimmer h-8 w-16 rounded-lg" />
                  <div className="skeleton-shimmer h-8 w-16 rounded-lg" />
                  <div className="skeleton-shimmer h-8 w-16 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="card-v2 p-4">
                    <div className="skeleton-shimmer h-4 w-24 mb-2" />
                    <div className="skeleton-shimmer h-10 w-32 mb-2" />
                    <div className="skeleton-shimmer h-4 w-20" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <ChartSkeleton />
                </div>
              </div>
            </div>
            
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-v2 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="skeleton-shimmer w-10 h-10 rounded-lg" />
                  <div>
                    <div className="skeleton-shimmer h-5 w-24 mb-1" />
                    <div className="skeleton-shimmer h-3 w-32" />
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="skeleton-shimmer h-4 w-12" />
                      <div className="flex-1 skeleton-shimmer h-2 rounded-full" />
                      <div className="skeleton-shimmer h-4 w-8" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="card-v2 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="skeleton-shimmer w-10 h-10 rounded-lg" />
                  <div>
                    <div className="skeleton-shimmer h-5 w-24 mb-1" />
                    <div className="skeleton-shimmer h-3 w-32" />
                  </div>
                </div>
                <TableSkeleton rows={4} />
              </div>
              <div className="card-v2 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="skeleton-shimmer w-10 h-10 rounded-lg" />
                  <div>
                    <div className="skeleton-shimmer h-5 w-24 mb-1" />
                    <div className="skeleton-shimmer h-3 w-32" />
                  </div>
                </div>
                <TableSkeleton rows={4} />
              </div>
              <div className="card-v2 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="skeleton-shimmer w-10 h-10 rounded-lg" />
                  <div>
                    <div className="skeleton-shimmer h-5 w-24 mb-1" />
                    <div className="skeleton-shimmer h-3 w-32" />
                  </div>
                </div>
                <LoyaltySkeleton />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
          {/* Revenue Overview - Top Section */}
          <div className="card-v2 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Revenue Overview</h2>
                <p className="text-sm text-gray-500">Track your earnings over time</p>
              </div>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`tab-pill ${period === p ? 'tab-pill-active' : 'tab-pill-inactive'}`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="card-v2 p-5 bg-gradient-to-br from-ghana-green/10 via-ghana-green/5 to-transparent border border-ghana-green/20">
                  <p className="text-sm text-gray-500 font-medium">{periodLabels[period]} Revenue</p>
                  <p className="text-3xl font-bold text-gradient mt-2">
                    GH₵ {revenue?.total?.toLocaleString() || '0'}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-sm text-green-600">
                    <Icon name="trending_up" size={16} />
                    <span>Total earnings</span>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                {revenue?.data && revenue.data.length > 0 ? (
                  <SimpleBarChart data={revenue.data} />
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-400">
                    <p>No revenue data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid for other cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours Card */}
            <div className="card-v2 p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-ghana-gold/10 rounded-xl flex items-center justify-center">
                  <Icon name="schedule" size={20} className="text-ghana-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Peak Hours</h2>
                  <p className="text-sm text-gray-500">Busiest days and times</p>
                </div>
              </div>

              {peakHours?.peakDays && peakHours.peakDays.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Top Busy Days</h3>
                    <div className="space-y-3">
                      {peakHours.peakDays.slice(0, 5).map((day, index) => {
                        const maxBookings = Math.max(...peakHours.peakDays.map(d => d.bookingCount), 1)
                        const colors = ['bg-ghana-green', 'bg-ghana-gold', 'bg-blue-500', 'bg-purple-500', 'bg-gray-400']
                        return (
                          <div key={day.day} className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 w-12">{day.day.slice(0, 3)}</span>
                            <div className="flex-1">
                              <ProgressBar 
                                value={day.bookingCount} 
                                max={maxBookings} 
                                colorClass={colors[index % colors.length]} 
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8 text-right">
                              {day.bookingCount}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {peakHours.peakTimeRanges && peakHours.peakTimeRanges.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Peak Time Ranges</h3>
                      <div className="flex flex-wrap gap-2">
                        {peakHours.peakTimeRanges.map((range, index) => (
                          <span
                            key={index}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              range.intensity === 'high'
                                ? 'bg-red-100 text-red-700'
                                : range.intensity === 'medium'
                                ? 'bg-ghana-gold/20 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {range.start} - {range.end}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Icon name="schedule" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No peak hours data available</p>
                </div>
              )}
            </div>

            {/* Pricing Insights Card */}
            <div className="card-v2 p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Icon name="bar_chart" size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Pricing Insights</h2>
                  <p className="text-sm text-gray-500">Compare your prices with market average</p>
                </div>
              </div>

              {pricingInsights && pricingInsights.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 py-2">Service</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Your Price</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Market Avg</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingInsights.slice(0, 6).map((item) => (
                        <tr key={item.serviceId} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 text-sm text-gray-900 truncate max-w-[120px]">
                            {item.serviceName}
                          </td>
                          <td className="py-3 text-sm text-gray-900 text-right">
                            GH₵{item.yourPrice}
                          </td>
                          <td className="py-3 text-sm text-gray-500 text-right">
                            GH₵{item.marketAverage}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`text-sm font-medium ${
                                item.difference > 0
                                  ? 'text-green-600'
                                  : item.difference < 0
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                              }`}
                            >
                              {item.difference > 0 ? '+' : ''}
                              {item.difference}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Icon name="bar_chart" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No pricing data available</p>
                </div>
              )}
            </div>

            {/* Staff Performance Card */}
            <div className="card-v2 p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Icon name="group" size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Staff Performance</h2>
                  <p className="text-sm text-gray-500">Individual staff metrics</p>
                </div>
              </div>

              {staffPerformance && staffPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 py-2">Name</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Bookings</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Revenue</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Rating</th>
                        <th className="text-right text-xs font-medium text-gray-500 py-2">Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPerformance.slice(0, 5).map((staff) => (
                        <tr key={staff.workerId} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 text-sm text-gray-900">{staff.workerName}</td>
                          <td className="py-3 text-sm text-gray-900 text-right">{staff.bookings}</td>
                          <td className="py-3 text-sm text-gray-900 text-right">
                            GH₵{staff.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Icon name="star" size={14} className="text-ghana-gold" filled />
                              <span className="text-sm text-gray-900">{staff.rating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`text-sm font-medium ${
                                staff.completionRate >= 90
                                  ? 'text-green-600'
                                  : staff.completionRate >= 70
                                  ? 'text-ghana-gold'
                                  : 'text-red-600'
                              }`}
                            >
                              {staff.completionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Icon name="group" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No staff performance data available</p>
                </div>
              )}
            </div>

            {/* Client Loyalty Card */}
            <div className="card-v2 p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-ghana-red/10 rounded-xl flex items-center justify-center">
                  <Icon name="favorite" size={20} className="text-ghana-red" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Client Loyalty</h2>
                  <p className="text-sm text-gray-500">Customer retention metrics</p>
                </div>
              </div>

              {loyaltyMetrics ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="card-v2 p-4 text-center bg-gradient-to-br from-green-50 to-transparent border border-green-100">
                    <p className="text-3xl font-bold text-green-700">
                      {loyaltyMetrics.repeatCustomerRate}%
                    </p>
                    <p className="text-sm text-green-600 mt-1 font-medium">Repeat Rate</p>
                    <p className="text-xs text-green-500 mt-1">Customers who return</p>
                  </div>
                  
                  <div className="card-v2 p-4 text-center bg-gradient-to-br from-red-50 to-transparent border border-red-100">
                    <p className="text-3xl font-bold text-red-700">
                      {loyaltyMetrics.atRiskCustomers}
                    </p>
                    <p className="text-sm text-red-600 mt-1 font-medium">At Risk</p>
                    <p className="text-xs text-red-500 mt-1">May not return</p>
                  </div>
                  
                  <div className="card-v2 p-4 text-center bg-gradient-to-br from-blue-50 to-transparent border border-blue-100">
                    <p className="text-3xl font-bold text-blue-700">
                      {loyaltyMetrics.loyalCustomers}
                    </p>
                    <p className="text-sm text-blue-600 mt-1 font-medium">Loyal Customers</p>
                    <p className="text-xs text-blue-500 mt-1">Regular visitors</p>
                  </div>
                  
                  <div className="card-v2 p-4 text-center bg-gradient-to-br from-ghana-gold/10 to-transparent border border-ghana-gold/20">
                    <p className="text-3xl font-bold text-amber-700">
                      {loyaltyMetrics.averageVisitsPerCustomer}
                    </p>
                    <p className="text-sm text-amber-600 mt-1 font-medium">Avg Visits</p>
                    <p className="text-xs text-amber-500 mt-1">Per customer</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Icon name="calendar_today" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No loyalty data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </Layout>
  )
}
