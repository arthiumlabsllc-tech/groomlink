import { useState, useEffect } from 'react'
import { Users, Plus, Phone, Mail, MoreVertical, Store, ArrowRightCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, Worker } from '../lib/api'
import { useSalon } from '../store/SalonContext'
import AddStaffModal from '../components/AddStaffModal'

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

  return (
    <Layout activeTab="staff">
      {/* No Salon Setup Warning */}
      {hasSalon === false && !loading && (
        <div className="card text-center py-12 mb-6">
          <div className="w-20 h-20 bg-ghana-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-10 h-10 text-ghana-gold" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up your salon first</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            You need to create your salon profile before you can add staff members.
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

      {/* Normal Staff UI - only show if hasSalon is true */}
      {(hasSalon === true || hasSalon === null) && (
        <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Members</h1>
          <p className="text-gray-500">Manage your team members</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Staff
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-ghana-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading staff...</p>
        </div>
      ) : staff.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <div key={member.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-ghana-green/10 rounded-full flex items-center justify-center border-2 border-ghana-green/20">
                    <span className="text-ghana-green font-bold text-lg">
                      {getInitials(member.fullName)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{member.fullName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-sm text-gray-500">{member.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {member.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{member.phoneNumber}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{member.email}</span>
                  </div>
                )}
              </div>

              {member.specialties && member.specialties.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {member.specialties.map((specialty, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-1 bg-ghana-gold/10 text-amber-700 text-xs rounded-full font-medium"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Rating</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900">{member.rating || '0.0'}</span>
                  <span className="text-ghana-gold">★</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <div className="w-20 h-20 bg-ghana-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-ghana-green" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No staff members yet</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Add your first team member to start managing your salon staff and assign them to bookings.
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center justify-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
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
    </Layout>
  )
}
