import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, Worker } from '../lib/api'
import { useSalon } from '../store/SalonContext'
import AddStaffModal from '../components/AddStaffModal'

function StaffSkeleton() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-v2 p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 skeleton-shimmer rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="w-32 h-5 skeleton-shimmer rounded mb-2"></div>
              <div className="w-16 h-4 skeleton-shimmer rounded"></div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="w-36 h-4 skeleton-shimmer rounded"></div>
            <div className="w-44 h-4 skeleton-shimmer rounded"></div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              <div className="w-16 h-6 skeleton-shimmer rounded-full"></div>
              <div className="w-20 h-6 skeleton-shimmer rounded-full"></div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="w-12 h-4 skeleton-shimmer rounded"></div>
            <div className="w-16 h-5 skeleton-shimmer rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Staff() {
  const { salonId, loading: salonLoading, hasSalon } = useSalon()
  const [staff, setStaff] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchStaff = async () => {
    if (!salonId) return
    try {
      setLoading(true)
      const response = await api.getWorkers(salonId)
      if (response.success) {
        setStaff(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [salonId])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name="star"
            size={14}
            className={star <= rating ? 'text-ghana-gold' : 'text-gray-200'}
            filled={star <= rating}
          />
        ))}
      </div>
    )
  }

  return (
    <Layout activeTab="staff">
      <div className="page-enter">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card-v2 text-center py-12 mb-6">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="store" size={40} className="text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can add staff members.
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

      {/* Normal Staff UI - only show if hasSalon is true */}
      {(hasSalon === true || hasSalon === null) && (
        <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Members</h1>
          <p className="text-gray-500 text-sm sm:text-base">Manage your team members</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary btn-ripple flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px]"
        >
          <Icon name="add" size={20} />
          Add Staff
        </button>
      </div>

      {loading ? (
        <StaffSkeleton />
      ) : staff.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <div key={member.id} className="card-v2 p-4 sm:p-6 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-ghana-green to-ghana-green/80 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-white font-bold text-base sm:text-lg">
                      {getInitials(member.fullName)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{member.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${member.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-sm text-gray-500">{member.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                <button className="btn-ripple p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                  <Icon name="more_vert" size={20} />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {member.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="call" size={16} className="text-gray-400" />
                    <span className="text-gray-600">{member.phoneNumber}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="mail" size={16} className="text-gray-400" />
                    <span className="text-gray-600">{member.email}</span>
                  </div>
                )}
              </div>

              {member.specialties && member.specialties.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.specialties.map((specialty, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-1 bg-ghana-gold/10 text-amber-700 text-xs rounded-full font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Rating</span>
                <div className="flex items-center gap-2">
                  {renderStars(Math.round(member.rating || 0))}
                  <span className="font-semibold text-gray-900 text-sm">{member.rating || '0.0'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-v2 text-center py-16">
          <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="group" size={40} className="text-ghana-green" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff members yet</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Add your first team member to start managing your salon staff and assign them to bookings.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary btn-ripple flex items-center justify-center gap-2 mx-auto"
          >
            <Icon name="add" size={20} />
            Add Your First Team Member
          </button>
        </div>
      )}
        </>
      )}

      <AddStaffModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchStaff}
      />
      </div>
    </Layout>
  )
}
