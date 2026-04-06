import { Layout } from './Dashboard'

export default function Services() {
  return (
    <Layout activeTab="services">
      <h1 className="text-2xl font-bold text-gray-900">Services</h1>
      <p className="text-gray-500 mt-1">Manage your service offerings</p>
      <div className="mt-6 card">
        <p className="text-gray-600">Service management coming soon...</p>
      </div>
    </Layout>
  )
}
