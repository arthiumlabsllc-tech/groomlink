import { Layout } from './Dashboard'

export default function Bookings() {
  return (
    <Layout activeTab="bookings">
      <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
      <p className="text-gray-500 mt-1">Manage your salon appointments</p>
      <div className="mt-6 card">
        <p className="text-gray-600">Booking management coming soon...</p>
      </div>
    </Layout>
  )
}
